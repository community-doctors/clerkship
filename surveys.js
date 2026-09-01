AAApp.context().then(async ctx=>{
  async function discardDraft(localId){
    const record=await ctx.db.getSubmission(localId);
    if(!record)return;
    if(record.form_status==="completed"){alert("Completed surveys cannot be discarded here.");return;}
    const label=record.household_number||"this draft";
    if(!confirm(`Discard ${label}? This cannot be undone.`))return;

    if(record.server_id){
      if(!ctx.online()||!ctx.client){
        alert("This draft was already synced. Reconnect before discarding it everywhere.");
        return;
      }
      if(record.photo_path){
        const {error:photoError}=await ctx.client.storage.from("aa-field-media").remove([record.photo_path]);
        if(photoError){alert(`Could not remove the synced photo: ${photoError.message}`);return;}
      }
      const {error:serverError}=await ctx.client.from("aa_household_submissions").delete().eq("id",record.server_id);
      if(serverError){alert(`Could not delete the synced draft: ${serverError.message}`);return;}
    }

    await ctx.db.deleteMedia(`${localId}:household_photo`).catch(()=>{});
    await ctx.db.deleteSubmission(localId);
    await local();
    await server();
  }

  async function local(){
    const rows=await ctx.db.getAllSubmissions();
    document.getElementById("local-summary").textContent=`${rows.length} local`;
    const t=document.getElementById("local-list");
    if(!rows.length){t.innerHTML='<div class="empty">No local surveys.</div>';return;}

    t.innerHTML=rows.map(r=>`
      <div class="list-row aa-survey-row">
        <a class="aa-survey-open" href="household-survey.html?local_id=${encodeURIComponent(r.local_uuid)}">
          <span>
            <strong>${ctx.safe(r.household_number||"Household draft")}</strong>
            <small>${ctx.safe([r.barangay,r.zone].filter(Boolean).join(" · ")||"No location details")} · ${ctx.safe(r.form_status||"draft")}</small>
          </span>
          <span class="record-meta">
            <i class="status ${ctx.safe(r.sync_status||"pending")}">${ctx.safe(r.sync_status||"pending")}</i>
            <small>${r.has_location?"GPS ✓":"No GPS"}</small>
          </span>
        </a>
        ${r.form_status!=="completed"?`<button class="aa-discard-draft" type="button" data-discard-local="${ctx.safe(r.local_uuid)}">Discard</button>`:""}
      </div>
    `).join("");

    t.querySelectorAll("[data-discard-local]").forEach(btn=>{
      btn.addEventListener("click",()=>discardDraft(btn.dataset.discardLocal));
    });
  }

  async function server(){
    const t=document.getElementById("server-list");
    if(!ctx.online()||!ctx.client){
      const cached=await ctx.db.getSetting("cached_server_surveys")||[];
      render(cached,true);
      return;
    }
    const{data,error}=await ctx.client.from("aa_household_submissions")
      .select("id,household_code,interview_date,barangay,zone,interviewer,status,latitude,longitude,gps_accuracy_m,updated_at")
      .order("updated_at",{ascending:false}).limit(150);
    if(error){t.innerHTML=`<div class="empty">${ctx.safe(error.message)}</div>`;return;}
    await ctx.db.setSetting("cached_server_surveys",data||[]);
    render(data||[],false);
  }

  function render(rows,cached){
    const t=document.getElementById("server-list");
    if(!rows.length){t.innerHTML='<div class="empty">No synced surveys.</div>';return;}
    t.innerHTML=(cached?'<div class="cache-note">Offline · last synced list</div>':"")+rows.map(r=>`
      <div class="list-row">
        <span><strong>${ctx.safe(r.household_code||"Household")}</strong><small>${ctx.safe([r.barangay,r.zone,r.interview_date].filter(Boolean).join(" · "))}</small></span>
        <span class="record-meta"><i class="status synced">${ctx.safe(r.status||"completed")}</i><small>${r.latitude?"GPS ✓":"No GPS"}</small></span>
      </div>`).join("");
  }

  document.getElementById("sync-all").addEventListener("click",async()=>{
    if(!ctx.online()){alert("Offline. Records remain on this device.");return;}
    const btn=document.getElementById("sync-all");
    btn.disabled=true;btn.textContent="Syncing…";
    const r=await AASurveySync.syncAll(ctx);
    btn.disabled=false;btn.textContent=`Sync done · ${r.ok} uploaded${r.errors?" · "+r.errors+" failed":""}`;
    await local();await server();
  });

  document.getElementById("refresh-server").addEventListener("click",server);
  await local();await server();
}).catch(console.error);