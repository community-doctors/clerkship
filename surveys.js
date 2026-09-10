AAApp.context().then(async ctx=>{
  const actions = window.AASurveyRecordActions;
  let serverRows = new Map();

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
    const s=csvValue(value).replace(/\r?\n/g,"\\n");
    return `"${s.replaceAll('"','""')}"`;
  }

  async function fetchAllRawRows(){
    const all=[]; const pageSize=1000;
    for(let from=0;;from+=pageSize){
      const {data,error}=await ctx.client
        .from("aa_household_submissions")
        .select("id,local_uuid,submitted_by,status,household_code,interview_date,barangay,zone,interviewer,response_json,latitude,longitude,gps_accuracy_m,location_captured_at,photo_path,created_at,updated_at")
        .order("created_at",{ascending:true})
        .range(from,from+pageSize-1);
      if(error)throw error;
      const rows=data||[]; all.push(...rows);
      if(rows.length<pageSize)break;
    }
    return all;
  }

  async function downloadRawCsv(){
    if(!ctx.online()||!ctx.client){alert("Connect to the internet to download the complete synced raw dataset.");return;}
    const btn=document.getElementById("download-csv");
    btn.disabled=true; const oldText=btn.textContent; btn.textContent="Preparing…";
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
      const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url; a.download=`alang-alang-household-raw-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(err){console.error(err);alert(`CSV export failed: ${err.message||err}`);}
    finally{btn.disabled=false;btn.textContent=oldText;}
  }

  async function editLocal(localId){
    location.href=`household-survey.html?local_id=${encodeURIComponent(localId)}`;
  }

  async function discardLocal(localId){
    const record=await ctx.db.getSubmission(localId);
    if(!record)return;
    const removed=await actions.removeRecord(ctx,record);
    if(removed){await local();await server();}
  }

  async function editServer(id){
    if(!ctx.online()){alert("Reconnect to edit a synced survey that is not already stored on this device.");return;}
    const row=serverRows.get(id); if(!row)return;
    const localRecord=await actions.materializeServerRecord(ctx,row);
    if(localRecord)location.href=`household-survey.html?local_id=${encodeURIComponent(localRecord.local_uuid)}`;
  }

  async function discardServer(id){
    const row=serverRows.get(id); if(!row)return;
    const removed=await actions.removeRecord(ctx,{
      ...row,
      server_id:row.id,
      form_status:row.status,
      household_number:row.household_code
    });
    if(removed){
      const localCopy=await ctx.db.getSubmission(row.local_uuid);
      if(localCopy){
        await ctx.db.deleteMedia(`${row.local_uuid}:household_photo`).catch(()=>{});
        await ctx.db.deleteSubmission(row.local_uuid).catch(()=>{});
      }
      await local(); await server();
    }
  }

  async function local(){
    const rows=await ctx.db.getAllSubmissions();
    document.getElementById("local-summary").textContent=`${rows.length} local`;
    const t=document.getElementById("local-list");
    if(!rows.length){t.innerHTML='<div class="empty">No local surveys.</div>';return;}

    t.innerHTML=rows.map(r=>{
      const manageable=actions.canManage(ctx,r);
      return `<div class="list-row aa-survey-row aa-editable-record">
        <button class="aa-record-main" type="button" data-edit-local="${ctx.safe(r.local_uuid)}">
          <span><strong>${ctx.safe(r.household_number||"Household survey")}</strong><small>${ctx.safe([r.barangay,r.zone].filter(Boolean).join(" · ")||"No location details")} · ${ctx.safe(r.form_status||"draft")}</small></span>
          <span class="record-meta"><i class="status ${ctx.safe(r.sync_status||"pending")}">${ctx.safe(r.sync_status||"pending")}</i><small>${r.has_location?"GPS ✓":"No GPS"}</small></span>
        </button>
        <div class="aa-record-actions">
          <button type="button" data-edit-local="${ctx.safe(r.local_uuid)}">Edit</button>
          ${manageable?`<button class="danger" type="button" data-discard-local="${ctx.safe(r.local_uuid)}">Discard</button>`:""}
        </div>
      </div>`;
    }).join("");

    t.querySelectorAll("[data-edit-local]").forEach(btn=>btn.addEventListener("click",()=>editLocal(btn.dataset.editLocal)));
    t.querySelectorAll("[data-discard-local]").forEach(btn=>btn.addEventListener("click",()=>discardLocal(btn.dataset.discardLocal)));
  }

  async function server(){
    const t=document.getElementById("server-list");
    if(!ctx.online()||!ctx.client){
      const cached=await ctx.db.getSetting("cached_server_surveys")||[];
      serverRows=new Map(); renderServer(cached,true); return;
    }

    const {data,error}=await ctx.client.from("aa_household_submissions")
      .select("id,local_uuid,submitted_by,status,household_code,interview_date,barangay,zone,interviewer,response_json,latitude,longitude,gps_accuracy_m,location_captured_at,photo_path,created_at,updated_at")
      .order("updated_at",{ascending:false}).limit(150);
    if(error){t.innerHTML=`<div class="empty">${ctx.safe(error.message)}</div>`;return;}

    const rows=data||[];
    serverRows=new Map(rows.map(r=>[r.id,r]));
    const cacheRows=rows.map(({response_json,photo_path,...r})=>r);
    await ctx.db.setSetting("cached_server_surveys",cacheRows);
    renderServer(rows,false);
  }

  function renderServer(rows,cached){
    const t=document.getElementById("server-list");
    if(!rows.length){t.innerHTML='<div class="empty">No synced surveys.</div>';return;}
    const note=cached?'<div class="cache-note">Offline · last synced list · reconnect to edit synced-only records</div>':'';
    t.innerHTML=note+rows.map(r=>{
      const manageable=!cached&&actions.canManage(ctx,r);
      const content=`<span><strong>${ctx.safe(r.household_code||"Household")}</strong><small>${ctx.safe([r.barangay,r.zone,r.interview_date].filter(Boolean).join(" · "))}</small></span><span class="record-meta"><i class="status synced">${ctx.safe(r.status||"completed")}</i><small>${r.latitude?"GPS ✓":"No GPS"}</small></span>`;
      return `<div class="list-row aa-survey-row aa-server-record ${manageable?'is-clickable':''}">
        ${manageable?`<button class="aa-record-main" type="button" data-edit-server="${ctx.safe(r.id)}">${content}</button>`:`<div class="aa-record-main aa-record-static">${content}</div>`}
        ${manageable?`<div class="aa-record-actions"><button type="button" data-edit-server="${ctx.safe(r.id)}">Edit</button><button class="danger" type="button" data-discard-server="${ctx.safe(r.id)}">Discard</button></div>`:""}
      </div>`;
    }).join("");

    t.querySelectorAll("[data-edit-server]").forEach(btn=>btn.addEventListener("click",()=>editServer(btn.dataset.editServer)));
    t.querySelectorAll("[data-discard-server]").forEach(btn=>btn.addEventListener("click",()=>discardServer(btn.dataset.discardServer)));
  }

  document.getElementById("sync-all").addEventListener("click",async()=>{
    if(!ctx.online()){alert("Offline. Records remain on this device.");return;}
    const btn=document.getElementById("sync-all"); btn.disabled=true; btn.textContent="Syncing…";
    const r=await AASurveySync.syncAll(ctx);
    btn.disabled=false; btn.textContent=`Sync done · ${r.ok} uploaded${r.errors?" · "+r.errors+" failed":""}`;
    await local(); await server();
  });

  document.getElementById("download-csv")?.addEventListener("click",downloadRawCsv);
  document.getElementById("refresh-server").addEventListener("click",server);
  await local(); await server();
}).catch(console.error);
