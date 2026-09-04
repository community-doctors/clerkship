AAApp.context().then(async ctx=>{
  const RAW_META_COLUMNS = [
    "id","local_uuid","submitted_by","status","household_code","interview_date",
    "barangay","zone","interviewer","latitude","longitude","gps_accuracy_m",
    "location_captured_at","photo_path","created_at","updated_at"
  ];

  function csvValue(value){
    if(value===null||value===undefined)return "";
    if(Array.isArray(value)){
      const simple=value.every(v=>v===null||["string","number","boolean"].includes(typeof v));
      return simple?value.filter(v=>v!==null).join(" | "):JSON.stringify(value);
    }
    if(typeof value==="object")return JSON.stringify(value);
    return String(value);
  }

  function csvEscape(value){
    const s=csvValue(value).replace(/\r?\n/g,"\n");
    return `"${s.replaceAll('"','""')}"`;
  }

  async function fetchAllRawRows(){
    const all=[];
    const pageSize=1000;
    for(let from=0;;from+=pageSize){
      const to=from+pageSize-1;
      const {data,error}=await ctx.client
        .from("aa_household_submissions")
        .select("id,local_uuid,submitted_by,status,household_code,interview_date,barangay,zone,interviewer,response_json,latitude,longitude,gps_accuracy_m,location_captured_at,photo_path,created_at,updated_at")
        .order("created_at",{ascending:true})
        .range(from,to);
      if(error)throw error;
      const rows=data||[];
      all.push(...rows);
      if(rows.length<pageSize)break;
    }
    return all;
  }

  async function downloadRawCsv(){
    if(!ctx.online()||!ctx.client){
      alert("Connect to the internet to download the complete synced raw dataset.");
      return;
    }

    const btn=document.getElementById("download-csv");
    btn.disabled=true;
    const oldText=btn.textContent;
    btn.textContent="Preparing…";

    try{
      const rows=await fetchAllRawRows();
      if(!rows.length){alert("No synced household records yet.");return;}

      const responseKeys=[...new Set(rows.flatMap(r=>Object.keys(r.response_json||{})))].sort((a,b)=>a.localeCompare(b));
      const headers=[...RAW_META_COLUMNS,...responseKeys.map(k=>`response_${k}`),"response_json_raw"];

      const lines=[headers.map(csvEscape).join(",")];
      for(const row of rows){
        const values=[];
        for(const key of RAW_META_COLUMNS)values.push(row[key]);
        for(const key of responseKeys)values.push((row.response_json||{})[key]);
        values.push(row.response_json||{});
        lines.push(values.map(csvEscape).join(","));
      }

      const csv="\uFEFF"+lines.join("\r\n");
      const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      const stamp=new Date().toISOString().slice(0,10);
      a.href=url;
      a.download=`alang-alang-household-raw-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(err){
      console.error(err);
      alert(`CSV export failed: ${err.message||err}`);
    }finally{
      btn.disabled=false;
      btn.textContent=oldText;
    }
  }
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

  document.getElementById("download-csv")?.addEventListener("click",downloadRawCsv);document.getElementById("refresh-server").addEventListener("click",server);
  await local();await server();
}).catch(console.error);