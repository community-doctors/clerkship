AAApp.context().then(async ctx=>{
  const TASKS=[
    {section:"Required Outputs",key:"output_entry_plan",title:"Community Entry Plan",hint:"Community immersion output"},
    {section:"Required Outputs",key:"output_rca",title:"Rapid Community Appraisal / Household Survey",hint:"Community assessment output"},
    {section:"Required Outputs",key:"output_profile",title:"Community Profile",hint:"Community assessment output"},
    {section:"Required Outputs",key:"output_diagnosis",title:"Community Diagnosis",hint:"Community assessment output"},
    {section:"Required Outputs",key:"output_chdp",title:"Community Health Development Plan",hint:"Planning & strategy output"},

    {section:"Entry & Organizing",key:"entry_rapport",title:"Build rapport with the community",hint:"Entry phase"},
    {section:"Entry & Organizing",key:"entry_health_system",title:"Get to know the community and health system",hint:"Entry phase"},
    {section:"Entry & Organizing",key:"entry_lgu_structure",title:"Review LGU, RHU and Barangay structure/function",hint:"Organization & governance"},
    {section:"Entry & Organizing",key:"entry_bhb",title:"Assess Barangay Health Board functionality",hint:"Ordinances · meetings · accomplishment reports"},
    {section:"Entry & Organizing",key:"entry_policies",title:"Review local health policies, resolutions and ordinances",hint:"Include technical committees if present"},

    {section:"Assessment Tools",key:"tool_survey",title:"Prepare survey questionnaire",hint:"Data gathering instrument"},
    {section:"Assessment Tools",key:"tool_interview",title:"Prepare interview guide",hint:"Data gathering instrument"},
    {section:"Assessment Tools",key:"tool_observation",title:"Prepare observation checklist",hint:"Data gathering instrument"},

    {section:"Data Gathering",key:"data_demographics",title:"Collect Barangay population demographics",hint:"Community data"},
    {section:"Data Gathering",key:"data_health_outcomes",title:"Collect health outcomes",hint:"Community data"},
    {section:"Data Gathering",key:"data_social_risks",title:"Collect social risk factors / SDOH",hint:"Community data"},
    {section:"Data Gathering",key:"data_catchment",title:"Collect neighborhood/catchment and municipal data",hint:"Community data"},
    {section:"Data Gathering",key:"data_health_activities",title:"Document currently implemented health activities",hint:"Community data"},

    {section:"Mapping & Analysis",key:"map_spot",title:"Create spot map",hint:"Residences · health facilities · roads"},
    {section:"Mapping & Analysis",key:"map_geocode",title:"Geocode residential locations",hint:"Link addresses to map coordinates"},
    {section:"Mapping & Analysis",key:"map_gis",title:"Map health patterns with social-risk context",hint:"GIS / visualization"},
    {section:"Mapping & Analysis",key:"analysis_descriptive",title:"Run descriptive statistical analysis",hint:"Compare patterns and health outcomes"},
    {section:"Mapping & Analysis",key:"analysis_advanced",title:"Run advanced modeling listed in syllabus",hint:"Latent class / factor analysis, as required"},

    {section:"Diagnosis & Mobilization",key:"diag_priorities",title:"Determine priorities and set goals",hint:"Community organizing process"},
    {section:"Diagnosis & Mobilization",key:"diag_mobilization",title:"Facilitate a community mobilization meeting",hint:"Use consensus-building techniques"},
    {section:"Diagnosis & Mobilization",key:"diag_strategy",title:"Select intervention strategies",hint:"Based on identified priorities"},

    {section:"Planning & Evaluation",key:"plan_measurable",title:"Make the CHDP measurable and budget-conscious",hint:"Community health development plan"},
    {section:"Planning & Evaluation",key:"plan_implementation",title:"Plan / begin implementation",hint:"Continues during Community Clerkship"},
    {section:"Planning & Evaluation",key:"plan_evaluate",title:"Evaluate results, sustainability and impact",hint:"Community-led interventions"},

    {section:"Course Learning Outcomes",key:"clo_sdh",title:"Analyze local health disparities using SDOH",hint:"Learning outcome"},
    {section:"Course Learning Outcomes",key:"clo_assessment",title:"Design a comprehensive community health assessment tool",hint:"Learning outcome"},
    {section:"Course Learning Outcomes",key:"clo_mobilization",title:"Facilitate mobilization using consensus-building",hint:"Learning outcome"},
    {section:"Course Learning Outcomes",key:"clo_chdp",title:"Develop a measurable, budget-conscious CHDP",hint:"Learning outcome"},
    {section:"Course Learning Outcomes",key:"clo_sustainability",title:"Evaluate sustainability and impact",hint:"Learning outcome"}
  ];

  const target=document.getElementById("checklist-sections");
  const statusEl=document.getElementById("check-sync-status");
  let progress={};
  let members={};

  function fmtDate(v){
    if(!v)return "";
    try{return new Date(v).toLocaleDateString(undefined,{month:"short",day:"numeric"});}catch{return ""}
  }

  function render(){
    const sections=[...new Set(TASKS.map(t=>t.section))];
    target.innerHTML=sections.map(section=>{
      const items=TASKS.filter(t=>t.section===section);
      const done=items.filter(t=>progress[t.key]?.is_done).length;
      return `<section class="check-section">
        <div class="check-section-head"><div><span class="eyebrow">${done} / ${items.length}</span><h2>${ctx.safe(section)}</h2></div></div>
        <div class="check-list">${items.map(t=>{
          const p=progress[t.key]||{};
          const by=p.completed_by?members[p.completed_by]:"";
          const meta=p.is_done?[by,fmtDate(p.completed_at)].filter(Boolean).join(" · "):"";
          return `<label class="check-item ${p.is_done?"is-done":""}">
            <input type="checkbox" data-task="${ctx.safe(t.key)}" ${p.is_done?"checked":""} ${ctx.online()?"":"disabled"}>
            <span class="check-item-copy"><strong>${ctx.safe(t.title)}</strong><small>${ctx.safe(t.hint)}</small></span>
            <span class="check-item-meta">${ctx.safe(meta)}</span>
          </label>`;
        }).join("")}</div>
      </section>`;
    }).join("");

    const done=TASKS.filter(t=>progress[t.key]?.is_done).length;
    document.getElementById("overall-count").textContent=`${done} / ${TASKS.length}`;
    document.getElementById("overall-bar").style.width=`${Math.round(done/TASKS.length*100)}%`;

    target.querySelectorAll("[data-task]").forEach(box=>{
      box.addEventListener("change",()=>toggle(box.dataset.task,box.checked,box));
    });
  }

  async function loadMembers(){
    if(!ctx.online()||!ctx.client)return;
    const {data}=await ctx.client.from("aa_group_members").select("user_id,display_name").eq("is_active",true);
    members=Object.fromEntries((data||[]).map(x=>[x.user_id,x.display_name||"Member"]));
  }

  async function loadProgress(){
    if(ctx.online()&&ctx.client){
      const {data,error}=await ctx.client.from("aa_clerkship_checklist_progress").select("task_key,is_done,completed_by,completed_at,updated_at");
      if(error){
        statusEl.textContent="Run checklist SQL";
        target.innerHTML=`<div class="check-offline">${ctx.safe(error.message)}</div>`;
        return;
      }
      progress=Object.fromEntries((data||[]).map(x=>[x.task_key,x]));
      await ctx.db.setSetting("cached_clerkship_checklist",data||[]);
      statusEl.textContent="Synced";
    }else{
      const cached=await ctx.db.getSetting("cached_clerkship_checklist")||[];
      progress=Object.fromEntries(cached.map(x=>[x.task_key,x]));
      statusEl.textContent="Offline view";
    }
    render();
  }

  async function toggle(taskKey,isDone,box){
    if(!ctx.online()||!ctx.client){
      box.checked=!isDone;
      alert("Connect to update the shared checklist.");
      return;
    }
    box.disabled=true;
    statusEl.textContent="Saving…";
    const row={
      task_key:taskKey,
      is_done:isDone,
      completed_by:isDone?ctx.user.id:null,
      completed_at:isDone?new Date().toISOString():null,
      updated_at:new Date().toISOString()
    };
    const {data,error}=await ctx.client.from("aa_clerkship_checklist_progress").upsert(row,{onConflict:"task_key"}).select().single();
    if(error){
      box.checked=!isDone;
      box.disabled=false;
      statusEl.textContent="Save failed";
      alert(error.message);
      return;
    }
    progress[taskKey]=data;
    await ctx.db.setSetting("cached_clerkship_checklist",Object.values(progress));
    statusEl.textContent="Synced";
    render();
  }

  await loadMembers();
  await loadProgress();
}).catch(console.error);
