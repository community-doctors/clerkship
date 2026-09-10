(() => {
  const db = window.AAOfflineDB;

  function canManage(ctx, record) {
    if (!ctx || !record) return false;
    if (ctx.member?.role === "admin") return true;
    const owner = record.submitted_by || record.user_id;
    return !!owner && owner === ctx.user?.id;
  }

  async function removeRecord(ctx, record, {confirmFirst=true}={}) {
    if (!record) return false;
    if (!canManage(ctx, record)) {
      alert("You can only discard your own surveys.");
      return false;
    }

    const completed = (record.form_status || record.status) === "completed";
    const label = record.household_number || record.household_code || "this survey";
    const message = completed
      ? `Discard completed survey ${label}? This permanently removes the synced household record and cannot be undone.`
      : `Discard ${label}? This cannot be undone.`;

    if (confirmFirst && !confirm(message)) return false;

    const serverId = record.server_id || record.id || null;
    if (serverId) {
      if (!ctx.online() || !ctx.client) {
        alert("This survey is already synced. Reconnect before discarding it everywhere.");
        return false;
      }

      if (record.photo_path) {
        const {error:photoError} = await ctx.client.storage
          .from("aa-field-media")
          .remove([record.photo_path]);
        if (photoError) {
          alert(`Could not remove the synced photo: ${photoError.message}`);
          return false;
        }
      }

      const {error:serverError} = await ctx.client
        .from("aa_household_submissions")
        .delete()
        .eq("id", serverId);
      if (serverError) {
        alert(`Could not discard survey: ${serverError.message}`);
        return false;
      }
    }

    const localId = record.local_uuid;
    if (localId) {
      await db.deleteMedia(`${localId}:household_photo`).catch(()=>{});
      await db.deleteSubmission(localId).catch(()=>{});
    }
    return true;
  }

  async function materializeServerRecord(ctx, row) {
    if (!canManage(ctx, row)) {
      alert("You can only edit your own surveys.");
      return null;
    }

    const existing = await db.getSubmission(row.local_uuid);
    if (existing && existing.sync_status !== "synced") {
      // Preserve any unsynced work already on this device.
      return existing;
    }

    const gps = (row.latitude !== null && row.latitude !== undefined && row.longitude !== null && row.longitude !== undefined)
      ? {
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.gps_accuracy_m ?? null,
          altitude: null,
          captured_at: row.location_captured_at || null,
          source: "server"
        }
      : null;

    const local = {
      local_uuid: row.local_uuid,
      form_code: "SHS-HH-2023",
      form_version: "2023.1",
      form_status: row.status || "completed",
      sync_status: "synced",
      server_id: row.id,
      submitted_by: row.submitted_by,
      user_id: row.submitted_by,
      community_id: null,
      community_name: "Alang-Alang",
      household_number: row.household_code || "",
      interview_date: row.interview_date || "",
      barangay: row.barangay || "",
      zone: row.zone || "",
      interviewer: row.interviewer || "",
      responses: row.response_json || {},
      gps,
      has_location: !!gps,
      has_photo: !!row.photo_path,
      photo_path: row.photo_path || null,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
      synced_at: row.updated_at || new Date().toISOString(),
      last_error: null
    };

    await db.putSubmission(local);
    return local;
  }

  window.AASurveyRecordActions = {canManage, removeRecord, materializeServerRecord};

  // Household Survey page: override the old draft-only discard handler at capture phase.
  const discardBtn = document.getElementById("discard-draft-btn");
  if (discardBtn) {
    discardBtn.textContent = "Discard Survey";
    discardBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const ctx = await window.AAApp.context({allowOffline:true});
        const localId = new URLSearchParams(location.search).get("local_id");
        const record = localId ? await db.getSubmission(localId) : null;
        if (!record) {
          location.replace("surveys.html");
          return;
        }
        const removed = await removeRecord(ctx, record);
        if (removed) location.replace("surveys.html");
      } catch (err) {
        console.error(err);
        alert(err.message || String(err));
      }
    }, true);
  }
})();
