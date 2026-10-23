AAApp.context().then(async ctx=>{
  let allRecords=[], filteredRecords=[], memberNames=new Map();
  let renderedQuestions=0;
  let activeProfileTab="overview";
  const csvRows=[];

  const REPEATER_SECTION={
    family_members:"Family & Demographics",
    adult_vitals:"Health & Adult Vitals",
    breastfeeding:"Maternal & Child Health",
    supplementary_feeding:"Maternal & Child Health",
    nutrition_children:"Maternal & Child Health",
    immunization_children:"Maternal & Child Health",
    illnesses:"Morbidity & Health Services",
    deaths:"Morbidity & Health Services",
    philhealth_members:"Morbidity & Health Services",
    covid_vaccines:"Morbidity & Health Services",
    community_leaders:"Community Resources",
    problems:"Community Resources"
  };

  const LABELS={
    respondent_relation:"Relationship of respondent to household head",
    respondent_age:"Respondent age",
    respondent_sex:"Respondent sex",
    respondent_information_source:"Information source",
    head_birthdate:"Household head birthdate",
    head_age:"Household head age",
    head_sex:"Household head sex",
    head_pregnancy_status:"Household head pregnancy status",
    head_education:"Household head educational attainment",
    head_occupation:"Household head occupation",
    head_monthly_income:"Household head monthly income",
    head_civil_status:"Household head civil status",
    head_employment_status:"Household head employment status",
    primary_language:"Primary language spoken at home",
    family_income_bracket:"Estimated average family income",
    food_production_engaged:"Engaged in food production",
    foodprod_vegetable:"Vegetable gardening use",
    foodprod_piggery:"Piggery use",
    foodprod_poultry:"Poultry use",
    foodprod_fruit:"Fruit tree use",
    community_org_involvement:"Family member involvement in an organization",
    community_org_member_count:"Number of family members involved in organizations",
    community_org_names:"Organizations joined",
    known_organizations:"Organizations known",
    community_projects_participated:"Community activities/projects participated in",
    pn_person_name:"Pregnant household member",
    pn_iron_iodine:"Iron and iodine supplementation",
    pn_folic_calcium:"Folic acid and calcium supplementation",
    pn_td_first:"Td vaccination — first pregnancy",
    pn_td_repeat:"Td vaccination — second or later pregnancy",
    pn_prenatal_care:"Prenatal care received",
    pn_first_trimester:"First prenatal visit in first trimester",
    pn_visit_each_trimester:"At least one prenatal visit per trimester",
    pn_total_visits:"Total prenatal visits",
    pn_postnatal_visit:"Postnatal visit within 4–6 weeks",
    delivery_trained_personnel:"Delivery attended by trained personnel",
    delivery_personnel_type:"Delivery attendant",
    delivery_facility:"Delivery in accredited facility",
    fp_access:"Access to family planning",
    fp_practicing:"Practicing family planning",
    fp_method:"Family planning method",
    fp_reason_no:"Reason for not practicing family planning",
    morbidity_diarrhea:"Repeated diarrhea in child below 6 years",
    mortality_preventable:"Preventable family death",
    avail_health_services:"Use of available health services",
    solo_parent_services:"Solo parent use of services",
    delay_decision:"Delay deciding to seek care",
    delay_reaching:"Delay reaching health care",
    delay_receiving:"Delay receiving appropriate care",
    health_services_rank:"Frequently availed health services",
    health_worker_rank:"Preferred health workers",
    health_interventions_rank:"Interventions used during illness",
    covid_no_reason:"Reason for no COVID-19 vaccine",
    water_domestic:"Domestic water source",
    water_drinking:"Drinking water source",
    water_storage:"Water storage",
    water_treatment:"Drinking water treatment",
    food_storage:"Food storage",
    with_toilet:"Household has toilet",
    toilet_type:"Toilet type",
    toilet_no_reason:"Reason for no toilet",
    toilet_ownership_function:"Toilet ownership/function",
    wastewater_disposal:"Wastewater disposal",
    garbage_collection:"Garbage collection",
    garbage_disposal:"Garbage disposal",
    with_animals:"Animals in household",
    animal_kind:"Kind of animals",
    animal_management:"Animal management",
    material_resources:"Material resources available for community projects",
    children_total:"Number of children",
    children_male:"Male children",
    children_female:"Female children",
    dependents_total:"Other dependents",
    dependents_male:"Male dependents",
    dependents_female:"Female dependents"
  };

  const SENSITIVE_KEYS=new Set([
    "head_name","respondent_name","pn_person_name","interviewer",
    "name","child_name","birthdate","head_birthdate"
  ]);

  function safe(v){return ctx.safe(v??"")}
  function normalize(v){return String(v??"").trim().replace(/\s+/g," ")}
  function blank(v){
    if(v===null||v===undefined)return true;
    if(Array.isArray(v))return v.length===0;
    if(typeof v==="object")return Object.keys(v).length===0;
    const s=normalize(v);
    return !s || /^(na|n\/a|not applicable)$/i.test(s);
  }
  function humanize(key){
    if(LABELS[key])return LABELS[key];
    return String(key).replace(/^response_/,"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
  }
  function isSensitive(key){
    const k=String(key).toLowerCase();
    return SENSITIVE_KEYS.has(k) || /(^|_)(name|birthdate|photo)($|_)/.test(k);
  }
  function numericValue(v){
    if(blank(v))return null;
    if(typeof v==="number"&&Number.isFinite(v))return v;
    const s=normalize(v);
    if(!/^-?[\d,.]+(?:\s*(?:kg|cm|m|%|c|°c))?$/i.test(s))return null;
    const n=Number(s.replace(/,/g,"").replace(/[^\d.-]/g,""));
    return Number.isFinite(n)?n:null;
  }
  function dateValue(v){
    if(blank(v))return null;
    const s=normalize(v);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
    const d=new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime())?null:d;
  }
  function pct(a,b){return b?Math.round(a/b*100):0}
  function median(arr){
    if(!arr.length)return null;
    const a=[...arr].sort((x,y)=>x-y),m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function fmt(n,d=1){
    return n===null||n===undefined||Number.isNaN(n)?"—":Number(n).toLocaleString(undefined,{maximumFractionDigits:d});
  }

  function exportSlug(v){
    return normalize(v||"graph").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"graph";
  }

  function exportToast(message){
    document.querySelector(".export-toast")?.remove();
    const el=document.createElement("div");
    el.className="export-toast";
    el.textContent=message;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1800);
  }

  function inlineStyles(source,clone){
    const src=[source,...source.querySelectorAll("*")];
    const dst=[clone,...clone.querySelectorAll("*")];
    for(let i=0;i<Math.min(src.length,dst.length);i++){
      const cs=getComputedStyle(src[i]);
      let css="";
      for(const prop of cs)css+=`${prop}:${cs.getPropertyValue(prop)};`;
      dst[i].setAttribute("style",css);
    }
  }


  function applyApaExportStyles(root){
    const all=[root,...root.querySelectorAll("*")];

    all.forEach(el=>{
      el.style.fontFamily='"Times New Roman", Times, serif';
      el.style.boxShadow="none";
      el.style.textShadow="none";
    });

    root.style.background="#ffffff";
    root.style.color="#000000";
    root.style.border="0";
    root.style.borderRadius="0";

    root.querySelectorAll(".profile-card,.question-card,.metric-card,.kpi-card,.profile-kpi").forEach(el=>{
      el.style.background="#ffffff";
      el.style.color="#000000";
      el.style.border="0";
      el.style.borderRadius="0";
      el.style.padding="8px";
    });

    root.querySelectorAll("h1,h2,h3,strong,b,.bar-label,.age-band,.zone-name").forEach(el=>{
      el.style.color="#000000";
    });

    root.querySelectorAll(".field-code,.question-sub,.profile-sub,.text-note,.more-note,small,.bar-value,.pyramid-footer,.profile-note").forEach(el=>{
      el.style.color="#444444";
    });

    root.querySelectorAll(".bar-track,.progress-track,.pyramid-side").forEach(el=>{
      el.style.background="#eeeeee";
      el.style.borderRadius="0";
    });

    root.querySelectorAll(".bar-track i,.progress-track i,.hist-bin i").forEach(el=>{
      el.style.background="#555555";
      el.style.borderRadius="0";
    });

    root.querySelectorAll(".pyramid-side.male i").forEach(el=>{
      el.style.background="#333333";
      el.style.color="#ffffff";
    });
    root.querySelectorAll(".pyramid-side.female i").forEach(el=>{
      el.style.background="#888888";
      el.style.color="#ffffff";
    });

    root.querySelectorAll(".donut").forEach(el=>{
      const angle=el.style.getPropertyValue("--donut-angle")||"0deg";
      el.style.background=`conic-gradient(#444444 0deg ${angle}, #dddddd ${angle} 360deg)`;
    });
    root.querySelectorAll(".donut:after").forEach(()=>{});

    root.querySelectorAll(".profile-matrix td").forEach(el=>{
      const text=normalize(el.textContent);
      el.style.background=text==="—" ? "#ffffff" : "#eeeeee";
      el.style.color="#000000";
      el.style.border="1px solid #cccccc";
      el.style.borderRadius="0";
    });
    root.querySelectorAll(".profile-matrix th").forEach(el=>{
      el.style.background="#ffffff";
      el.style.color="#000000";
    });

    root.querySelectorAll(".identifier-box,.no-data-box,.profile-note").forEach(el=>{
      el.style.background="#ffffff";
      el.style.border="1px solid #cccccc";
      el.style.borderRadius="0";
    });

    root.querySelectorAll(".pill").forEach(el=>{
      el.style.background="#ffffff";
      el.style.color="#000000";
      el.style.border="1px solid #777777";
    });

    // Hide UI-only elements from publication export.
    root.querySelectorAll(".card-download-wrap,.graph-download-button,.source-inline-button,.profile-tabs,.analytics-actions,.analytics-nav").forEach(el=>el.remove());

    // Slightly larger paper-readable typography.
    root.querySelectorAll("h3").forEach(el=>el.style.fontSize="13px");
    root.querySelectorAll(".bar-label,.bar-value,.question-sub,.profile-sub").forEach(el=>el.style.fontSize="8px");
  }

  function buildExportSvg(element){
    const rect=element.getBoundingClientRect();
    const width=Math.max(320,Math.ceil(rect.width));
    const clone=element.cloneNode(true);
    clone.classList.add("export-clone");
    clone.querySelectorAll(".card-download-wrap,.graph-download-button").forEach(x=>x.remove());
    inlineStyles(element,clone);
    applyApaExportStyles(clone);
    clone.style.width=`${width}px`;
    clone.style.maxWidth="none";
    clone.style.margin="0";
    clone.style.background="#ffffff";
    const wrap=document.createElement("div");
    wrap.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
    wrap.style.width=`${width}px`;
    wrap.style.background="#ffffff";
    wrap.appendChild(clone);
    const html=new XMLSerializer().serializeToString(wrap);
    const height=Math.max(180,Math.ceil(rect.height)+12);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width+32}" height="${height+32}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <foreignObject x="16" y="16" width="${width}" height="${height}">${html}</foreignObject>
    </svg>`;
    return {svg,width:width+32,height:height+32};
  }

  async function downloadGraphImage(element,title){
    const {svg,width,height}=buildExportSvg(element);
    const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{
        img.onload=resolve; img.onerror=reject; img.src=url;
      });
      const scale=3;
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(width*scale);
      canvas.height=Math.round(height*scale);
      const c=canvas.getContext("2d");
      c.scale(scale,scale);
      c.fillStyle="#fff"; c.fillRect(0,0,width,height);
      c.drawImage(img,0,0,width,height);
      const png=await new Promise(resolve=>canvas.toBlob(resolve,"image/png",0.95));
      if(!png)throw new Error("PNG unavailable");
      const pngUrl=URL.createObjectURL(png);
      const a=document.createElement("a");
      a.href=pngUrl;
      a.download=`${exportSlug(title)}-apa-tnr.png`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(pngUrl),1000);
      exportToast("APA/TNR graph downloaded");
    }catch(err){
      const a=document.createElement("a");
      a.href=url;
      a.download=`${exportSlug(title)}-apa-tnr.svg`;
      document.body.appendChild(a);a.click();a.remove();
      exportToast("APA/TNR graph downloaded as SVG");
    }finally{
      setTimeout(()=>URL.revokeObjectURL(url),1200);
    }
  }

  function attachDownloadButtons(root=document){
    root.querySelectorAll(".profile-card,.question-card").forEach((card,index)=>{
      if(card.querySelector(":scope > .card-download-wrap"))return;
      const title=card.querySelector("h3")?.textContent?.trim()||`graph-${index+1}`;
      const wrap=document.createElement("div");
      wrap.className="card-download-wrap";
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="card-download-button";
      btn.textContent="↓ APA PNG";
      btn.addEventListener("click",async e=>{
        e.stopPropagation();
        btn.disabled=true;
        const old=btn.textContent;
        btn.textContent="Saving…";
        try{await downloadGraphImage(card,`alang-alang-${title}`);}
        catch(err){console.error(err);alert("Could not export this graph in this browser.");}
        finally{btn.disabled=false;btn.textContent=old;}
      });
      wrap.appendChild(btn);
      card.appendChild(wrap);
    });
  }

  function fieldLabel(path){
    const parts=path.split(".");
    const field=parts[parts.length-1];
    const parent=parts.length>1?humanize(parts[0]):"";
    return parts.length>1?`${parent} — ${humanize(field)}`:humanize(field);
  }

  function sectionForTopKey(key){
    const k=String(key);
    if(/^(respondent_|head_|children_|dependents_|family_members$)/.test(k))return "Family & Demographics";
    if(/^(religion|primary_language|family_income|livelihood|food_production|foodprod_|property_|housing_|appliances|appliance_|transport|utilities|basic_clothing|food_consumption)/.test(k))return "Socioeconomic & Cultural";
    if(/^(breastfeeding|supplementary_feeding|nutrition_children|immunization_children|pn_|delivery_|fp_)/.test(k))return "Maternal & Child Health";
    if(/^(adult_vitals|morbidity_|mortality_|illnesses|deaths|philhealth_members|avail_health|solo_parent|delay_|health_|covid_)/.test(k))return "Morbidity & Health Services";
    if(/^(water_|food_storage|with_toilet|toilet_|wastewater_|garbage_|with_animals|animal_)/.test(k))return "Environment & Sanitation";
    if(/^(community_org|known_organizations|community_projects|decision_)/.test(k))return "Participation & Decision-Making";
    if(/^(community_leaders|material_resources|problems)/.test(k))return "Community Resources";
    return "Other Survey Fields";
  }

  async function loadMemberNames(){
    if(!ctx.online()||!ctx.client)return;
    const {data}=await ctx.client.from("aa_group_members").select("user_id,display_name").eq("is_active",true);
    memberNames=new Map((data||[]).map(m=>[m.user_id,m.display_name||"Group member"]));
  }

  async function loadRecords(){
    if(ctx.online()&&ctx.client){
      const {data,error}=await ctx.client.from("aa_household_submissions")
        .select("id,local_uuid,submitted_by,status,household_code,interview_date,barangay,zone,interviewer,response_json,latitude,longitude,gps_accuracy_m,location_captured_at,photo_path,created_at,updated_at")
        .eq("status","completed")
        .order("updated_at",{ascending:false});
      if(error)throw error;
      allRecords=data||[];
      await ctx.db.setSetting("cached_full_analytics_v13",allRecords);
    }else{
      allRecords=await ctx.db.getSetting("cached_full_analytics_v13")
        ||await ctx.db.getSetting("cached_diagnosis_records_v12")
        ||await ctx.db.getSetting("cached_diagnosis_records")
        ||[];
    }
    filteredRecords=[...allRecords];
  }

  function encoderName(id){
    if(!id)return "Unknown";
    return memberNames.get(id)||"Group member";
  }

  function populateFilter(id,values,placeholder){
    const el=document.getElementById(id);
    const current=el.value;
    const vals=[...new Set(values.map(normalize).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    el.innerHTML=`<option value="">${safe(placeholder)}</option>`+vals.map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join("");
    if(vals.includes(current))el.value=current;
  }

  function setupFilters(){
    populateFilter("filter-barangay",allRecords.map(r=>r.barangay),"All barangays");
    populateFilter("filter-zone",allRecords.map(r=>r.zone),"All zones");
    populateFilter("filter-interviewer",allRecords.map(r=>r.interviewer),"All interviewers");
    populateFilter("filter-encoder",allRecords.map(r=>encoderName(r.submitted_by)),"All encoders");
  }

  function applyFilters(){
    const barangay=document.getElementById("filter-barangay").value;
    const zone=document.getElementById("filter-zone").value;
    const interviewer=document.getElementById("filter-interviewer").value;
    const encoder=document.getElementById("filter-encoder").value;
    const from=document.getElementById("filter-from").value;
    const to=document.getElementById("filter-to").value;

    filteredRecords=allRecords.filter(r=>{
      if(barangay && normalize(r.barangay)!==barangay)return false;
      if(zone && normalize(r.zone)!==zone)return false;
      if(interviewer && normalize(r.interviewer)!==interviewer)return false;
      if(encoder && encoderName(r.submitted_by)!==encoder)return false;
      const d=r.interview_date||"";
      if(from && d && d<from)return false;
      if(to && d && d>to)return false;
      return true;
    });

    document.getElementById("record-count").textContent=`n=${filteredRecords.length}`;
    renderAll();
  }

  function collectTopFields(){
    const keys=new Set();
    filteredRecords.forEach(r=>Object.keys(r.response_json||{}).forEach(k=>keys.add(k)));
    return [...keys].sort((a,b)=>a.localeCompare(b));
  }

  function topValues(key){
    return filteredRecords.map(r=>r.response_json?.[key]);
  }

  function repeaterRows(key){
    const rows=[];
    filteredRecords.forEach((r,recordIndex)=>{
      const arr=r.response_json?.[key];
      if(Array.isArray(arr)){
        arr.filter(v=>v&&typeof v==="object"&&!Array.isArray(v)).forEach((obj,rowIndex)=>rows.push({...obj,__recordIndex:recordIndex,__rowIndex:rowIndex}));
      }
    });
    return rows;
  }

  function inferType(vals,key){
    const answered=vals.filter(v=>!blank(v));
    if(isSensitive(key))return "identifier";
    if(!answered.length)return "empty";
    if(answered.some(v=>Array.isArray(v))){
      const arrays=answered.filter(Array.isArray);
      if(arrays.length && arrays.every(a=>a.every(x=>x===null||["string","number","boolean"].includes(typeof x))))return "multi";
      if(arrays.length && arrays.every(a=>a.every(x=>x&&typeof x==="object"&&!Array.isArray(x))))return "repeater";
    }
    if(answered.every(v=>dateValue(v)))return "date";
    const nums=answered.map(numericValue).filter(v=>v!==null);
    if(nums.length/answered.length>=.8 && new Set(nums).size>4)return "numeric";
    const norm=answered.map(v=>normalize(v).toLowerCase());
    const unique=[...new Set(norm)];
    const yesNo=new Set(["yes","no","true","false"]);
    if(unique.length<=3 && unique.every(v=>yesNo.has(v)))return "binary";
    if(unique.length<=12)return "categorical";
    const avg=answered.reduce((a,v)=>a+normalize(v).length,0)/answered.length;
    return avg>35||unique.length>12?"text":"categorical";
  }


  const RESPONSE_ALIASES=new Map(Object.entries({
    "htn":"Hypertension",
    "hypertension":"Hypertension",
    "hypertensive":"Hypertension",
    "high blood":"Hypertension",
    "high blood pressure":"Hypertension",
    "highblood":"Hypertension",
    "dm":"Diabetes mellitus",
    "diabetes":"Diabetes mellitus",
    "diabetes mellitus":"Diabetes mellitus",
    "type 2 diabetes":"Diabetes mellitus",
    "type ii diabetes":"Diabetes mellitus",
    "uti":"Urinary tract infection",
    "urinary tract infection":"Urinary tract infection",
    "urti":"Upper respiratory tract infection",
    "uri":"Upper respiratory tract infection",
    "upper respiratory infection":"Upper respiratory tract infection",
    "upper respiratory tract infection":"Upper respiratory tract infection",
    "tb":"Tuberculosis",
    "pulmonary tb":"Tuberculosis",
    "ptb":"Tuberculosis",
    "tuberculosis":"Tuberculosis",
    "diarrhoea":"Diarrhea",
    "diarrhea":"Diarrhea",
    "covid":"COVID-19",
    "covid 19":"COVID-19",
    "covid-19":"COVID-19",
    "none":"None",
    "no illness":"None",
    "no illnesses":"None",
    "nil":"None"
  }));

  function basicCategoryKey(value){
    return normalize(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .replace(/&/g," and ")
      .replace(/[\/_-]+/g," ")
      .replace(/[^\p{L}\p{N}\s]/gu," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function singularLike(key){
    if(key.length>5 && key.endsWith("ies"))return key.slice(0,-3)+"y";
    if(key.length>5 && key.endsWith("s") && !key.endsWith("ss") && !key.endsWith("us"))return key.slice(0,-1);
    return key;
  }

  function editDistance(a,b){
    if(a===b)return 0;
    if(!a.length)return b.length;
    if(!b.length)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let left=i,diag=i-1;
      prev[0]=i;
      for(let j=1;j<=b.length;j++){
        const up=prev[j];
        const val=Math.min(
          up+1,
          left+1,
          diag+(a[i-1]===b[j-1]?0:1)
        );
        diag=up;
        prev[j]=val;
        left=val;
      }
    }
    return prev[b.length];
  }

  function nearSameCategory(a,b){
    if(a===b)return true;
    const sa=singularLike(a),sb=singularLike(b);
    if(sa===sb)return true;
    const minLen=Math.min(sa.length,sb.length),maxLen=Math.max(sa.length,sb.length);
    if(minLen<5)return false;
    if(sa.slice(0,3)!==sb.slice(0,3))return false;
    const allowed=maxLen>=10?2:1;
    return Math.abs(sa.length-sb.length)<=allowed && editDistance(sa,sb)<=allowed;
  }

  function prettyCategory(value){
    const raw=normalize(value);
    const key=basicCategoryKey(raw);
    if(RESPONSE_ALIASES.has(key))return RESPONSE_ALIASES.get(key);
    if(!raw)return raw;
    if(raw===raw.toUpperCase() && raw.length<=6)return raw;
    return raw.replace(/\b\w/g,c=>c.toUpperCase());
  }

  function canonicalCategory(value){
    const raw=normalize(value);
    const key=basicCategoryKey(raw);
    const alias=RESPONSE_ALIASES.get(key);
    return {key:alias?basicCategoryKey(alias):singularLike(key),label:alias||prettyCategory(raw)};
  }


  function traceData(spec){
    if(!spec)return "";
    return ` data-trace="${safe(encodeURIComponent(JSON.stringify(spec)))}" tabindex="0" role="button" title="View source survey(s)"`;
  }

  function makeTraceSpec(base,value,extra={}){
    if(!base)return null;
    return {...base,value,...extra};
  }

  function counts(vals,{multi=false}={}){
    const groups=[];
    vals.forEach(raw=>{
      const items=multi?(Array.isArray(raw)?raw:[raw]):[raw];
      items.forEach(v=>{
        if(blank(v))return;
        const c=canonicalCategory(v);
        if(!c.key)return;
        let found=groups.find(g=>nearSameCategory(g.key,c.key));
        if(!found){
          found={key:c.key,label:c.label,count:0,variants:new Set()};
          groups.push(found);
        }
        found.count++;
        found.variants.add(normalize(v));
        if(c.label.length<found.label.length && !RESPONSE_ALIASES.has(found.key))found.label=c.label;
      });
    });
    return groups
      .map(g=>({label:g.label,count:g.count,variants:[...g.variants]}))
      .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  }

  function answeredCount(vals){return vals.filter(v=>!blank(v)).length}

  function renderBars(items,denom,limit=Infinity,traceBase=null){
    if(!items.length)return '<div class="no-data-box">No answered data.</div>';
    const shown=Number.isFinite(limit)?items.slice(0,limit):items;
    const max=Math.max(...shown.map(x=>x.count),1);
    return `<div class="bar-chart all-categories">${shown.map(x=>{
      const percent=denom?pct(x.count,denom):0;
      const width=Math.max(3,Math.round(x.count/max*100));
      const variantNote=x.variants&&x.variants.length>1?` title="Combined variants: ${safe(x.variants.join(" | "))}"`:"";
      const trace=makeTraceSpec(traceBase,x.label,{variants:x.variants||[]});
      return `<div class="bar-row${trace?" traceable-data":""}"${variantNote}${traceData(trace)}><span class="bar-label">${safe(x.label)}</span><span class="bar-track"><i style="width:${width}%"></i></span><span class="bar-value">${x.count}${denom?` · ${percent}%`:""}</span></div>`;
    }).join("")}</div>`;
  }

  function binaryChart(vals,traceBase=null){
    const answered=vals.filter(v=>!blank(v));
    const yes=answered.filter(v=>/^(yes|true)$/i.test(normalize(v))).length;
    const no=answered.filter(v=>/^(no|false)$/i.test(normalize(v))).length;
    const denom=yes+no;
    const p=denom?pct(yes,denom):0;
    return `<div class="binary-chart">
      <div class="donut" style="--donut-angle:${Math.round(p*3.6)}deg"><strong>${p}%</strong></div>
      <div class="donut-legend">
        <div class="${traceBase?"traceable-data":""}"${traceData(makeTraceSpec(traceBase,"Yes"))}><span>Yes</span><b>${yes}</b></div>
        <div class="${traceBase?"traceable-data":""}"${traceData(makeTraceSpec(traceBase,"No"))}><span>No</span><b>${no}</b></div>
        <div><span>Answered</span><b>${denom}</b></div>
      </div>
    </div>`;
  }

  function numericChart(vals){
    const nums=vals.map(numericValue).filter(v=>v!==null);
    if(!nums.length)return '<div class="no-data-box">No numeric data.</div>';
    const min=Math.min(...nums),max=Math.max(...nums),mean=nums.reduce((a,b)=>a+b,0)/nums.length,med=median(nums);
    let bins=[];
    if(min===max){
      bins=[{lo:min,hi:max,count:nums.length}];
    }else{
      const binCount=Math.min(7,Math.max(4,Math.ceil(Math.sqrt(nums.length))));
      const step=(max-min)/binCount;
      bins=Array.from({length:binCount},(_,i)=>({lo:min+i*step,hi:i===binCount-1?max:min+(i+1)*step,count:0}));
      nums.forEach(n=>{
        const idx=Math.min(binCount-1,Math.floor((n-min)/step));
        bins[idx].count++;
      });
    }
    const maxCount=Math.max(...bins.map(b=>b.count),1);
    return `<div class="histogram">${bins.map(b=>`<span class="hist-bin"><i style="height:${Math.max(3,Math.round(b.count/maxCount*100))}%"></i><small>${fmt(b.lo,0)}${b.lo!==b.hi?`–${fmt(b.hi,0)}`:""}</small></span>`).join("")}</div>
      <div class="number-summary">
        <span>n<b>${nums.length}</b></span><span>Mean<b>${fmt(mean)}</b></span><span>Median<b>${fmt(med)}</b></span><span>Min<b>${fmt(min)}</b></span><span>Max<b>${fmt(max)}</b></span>
      </div>`;
  }

  function dateChart(vals,traceBase=null){
    const ds=vals.map(dateValue).filter(Boolean);
    const m=new Map();
    ds.forEach(d=>{
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      m.set(key,(m.get(key)||0)+1);
    });
    const items=[...m].sort((a,b)=>a[0].localeCompare(b[0])).map(([label,count])=>({label,count}));
    return renderBars(items,ds.length,Infinity,traceBase?{...traceBase,mode:"date-month"}:null);
  }

  function identifierChart(vals,traceBase=null){
    const n=answeredCount(vals);
    return `<div class="identifier-box"><strong>Identifier hidden</strong>${n} of ${filteredRecords.length} records contain this field. Values are not displayed in aggregate analytics.${traceBase?` <button type="button" class="source-inline-button traceable-data"${traceData({...traceBase,mode:"answered"})}>View source surveys</button>`:""}</div>`;
  }

  function textChart(vals,traceBase=null){
    const answered=vals.filter(v=>!blank(v));
    const itemCounts=counts(answered);
    const unique=itemCounts.length;
    const chart=renderBars(itemCounts,answered.length,Infinity,traceBase);
    return `${chart}<div class="text-note">${unique} unique response${unique===1?"":"s"} among ${answered.length} answered.</div>`;
  }

  function multiChart(vals,traceBase=null){
    const answered=vals.filter(v=>Array.isArray(v)&&v.length);
    const items=counts(answered,{multi:true});
    return renderBars(items,answered.length,Infinity,traceBase);
  }

  function chartFor(vals,key,type,path){
    const traceBase={kind:path.includes(".")?"repeater-field":"field",path,type};
    if(type==="identifier")return identifierChart(vals,traceBase);
    if(type==="binary")return binaryChart(vals,traceBase);
    if(type==="numeric")return numericChart(vals);
    if(type==="date")return dateChart(vals,traceBase);
    if(type==="multi")return multiChart(vals,traceBase);
    if(type==="text")return textChart(vals,traceBase);
    if(type==="categorical")return renderBars(counts(vals),answeredCount(vals),Infinity,traceBase);
    if(type==="empty")return '<div class="no-data-box">No answered data.</div>';
    return '<div class="no-data-box">Nested data summarized below.</div>';
  }

  function addCsv(path,label,type,vals,scope,denom){
    if(type==="identifier"){
      csvRows.push([path,label,type,scope,"Answered",answeredCount(vals),denom,""]);
      return;
    }
    if(type==="numeric"){
      const nums=vals.map(numericValue).filter(v=>v!==null);
      if(nums.length){
        csvRows.push([path,label,type,scope,"n",nums.length,denom,""]);
        csvRows.push([path,label,type,scope,"Mean",nums.reduce((a,b)=>a+b,0)/nums.length,denom,""]);
        csvRows.push([path,label,type,scope,"Median",median(nums),denom,""]);
        csvRows.push([path,label,type,scope,"Min",Math.min(...nums),denom,""]);
        csvRows.push([path,label,type,scope,"Max",Math.max(...nums),denom,""]);
      }
      return;
    }
    const multi=type==="multi";
    counts(vals,{multi}).forEach(x=>csvRows.push([path,label,type,scope,x.label,x.count,denom,denom?pct(x.count,denom):""]));
  }

  function questionCard(path,label,vals,scope="household",denomOverride=null){
    const key=path.split(".").pop();
    const type=inferType(vals,key);
    const answered=answeredCount(vals);
    const denom=denomOverride??(scope==="household"?filteredRecords.length:vals.length);
    addCsv(path,label,type,vals,scope,type==="multi"?vals.filter(v=>Array.isArray(v)&&v.length).length:(scope==="household"?filteredRecords.length:vals.length));
    renderedQuestions++;
    return `<article class="question-card" data-question="${safe((label+" "+path).toLowerCase())}">
      <div class="question-card-head"><h3>${safe(label)}</h3><div class="question-card-tools"><span class="field-code">${safe(path)}</span><button type="button" class="source-inline-button traceable-data"${traceData({kind:path.includes(".")?"repeater-field":"field",path,type,mode:"answered"})}>Sources</button></div></div>
      <div class="question-sub">
        <span>${safe(type)}</span>
        <span>${answered} answered</span>
        ${scope!=="household"?`<span>${safe(scope)}</span>`:""}
      </div>
      ${chartFor(vals,key,type,path)}
    </article>`;
  }

  function renderRepeater(key){
    const rows=repeaterRows(key);
    const fields=new Set();
    rows.forEach(row=>Object.keys(row).filter(k=>!k.startsWith("__")).forEach(k=>fields.add(k)));
    const cards=[];
    [...fields].sort().forEach(field=>{
      const vals=rows.map(r=>r[field]);
      cards.push(questionCard(`${key}.${field}`,fieldLabel(`${key}.${field}`),vals,`${rows.length} rows`,rows.length));
    });
    if(!cards.length){
      cards.push(`<article class="question-card"><div class="question-card-head"><h3>${safe(humanize(key))}</h3></div><div class="no-data-box">No rows recorded.</div></article>`);
    }
    return cards.join("");
  }

  function discoverSections(){
    const sections=new Map();
    const topKeys=collectTopFields();

    topKeys.forEach(key=>{
      const vals=topValues(key);
      const type=inferType(vals,key);
      if(type==="repeater"){
        const section=REPEATER_SECTION[key]||sectionForTopKey(key);
        if(!sections.has(section))sections.set(section,[]);
        sections.get(section).push({kind:"repeater",key});
      }else{
        const section=sectionForTopKey(key);
        if(!sections.has(section))sections.set(section,[]);
        sections.get(section).push({kind:"field",key});
      }
    });

    return sections;
  }

  function renderSections(){
    renderedQuestions=0;
    csvRows.length=0;
    const sections=discoverSections();
    const preferred=[
      "Family & Demographics","Socioeconomic & Cultural","Maternal & Child Health",
      "Health & Adult Vitals","Morbidity & Health Services","Environment & Sanitation",
      "Participation & Decision-Making","Community Resources","Other Survey Fields"
    ];
    const ordered=[...sections.keys()].sort((a,b)=>{
      const ai=preferred.indexOf(a),bi=preferred.indexOf(b);
      return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);
    });

    const html=ordered.map(section=>{
      const items=sections.get(section)||[];
      const cards=[];
      items.sort((a,b)=>a.key.localeCompare(b.key)).forEach(item=>{
        if(item.kind==="repeater")cards.push(renderRepeater(item.key));
        else cards.push(questionCard(item.key,humanize(item.key),topValues(item.key)));
      });
      return `<details class="analytics-section" id="section-${section.toLowerCase().replace(/[^a-z0-9]+/g,"-")}" open>
        <summary><strong>${safe(section)}</strong><small>${cards.length} group${cards.length===1?"":"s"}</small></summary>
        <div class="analytics-section-body"><div class="question-grid">${cards.join("")}</div></div>
      </details>`;
    }).join("");

    document.getElementById("questionnaire-analytics").innerHTML=html;
    document.getElementById("questions-graphed").textContent=`${renderedQuestions} fields`;
    buildNav();
    applyQuestionSearch();
  }

  function buildNav(){
    const nav=document.getElementById("analytics-nav");
    const sections=[...document.querySelectorAll(".analytics-section")];
    nav.innerHTML=sections.map((s,i)=>`<button type="button" data-target="${s.id}" class="${i===0?"active":""}">${safe(s.querySelector("summary strong")?.textContent||"Section")}</button>`).join("");
    nav.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
      document.getElementById(btn.dataset.target)?.scrollIntoView({behavior:"smooth",block:"start"});
      nav.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===btn));
    }));
  }

  function allQuestionKeysForSection(section){
    const keys=[];
    filteredRecords.forEach(r=>{
      Object.entries(r.response_json||{}).forEach(([key,value])=>{
        const inferred=Array.isArray(value)&&value.some(v=>v&&typeof v==="object"&&!Array.isArray(v))?"repeater":"field";
        const sec=inferred==="repeater"?(REPEATER_SECTION[key]||sectionForTopKey(key)):sectionForTopKey(key);
        if(sec===section)keys.push(key);
      });
    });
    return [...new Set(keys)];
  }

  function completionRate(section){
    const keys=allQuestionKeysForSection(section);
    let answered=0,total=0;
    filteredRecords.forEach(r=>{
      const j=r.response_json||{};
      keys.forEach(k=>{
        if(isSensitive(k))return;
        total++;
        if(!blank(j[k]))answered++;
      });
    });
    return total?Math.round(answered/total*100):0;
  }

  function renderCompleteness(){
    const sections=[...discoverSections().keys()];
    const target=document.getElementById("section-completeness");
    target.innerHTML=sections.map(section=>{
      const p=completionRate(section);
      return `<div class="completeness-row"><span>${safe(section)}</span><span class="progress-track"><i style="width:${p}%"></i></span><b>${p}%</b></div>`;
    }).join("")||'<div class="empty">No completed surveys yet.</div>';
  }


  const PROFILE_AGE_BANDS=["0–11 mos.","1–4","5–9","10–14","15–19","20–49","50–59","60 and above"];

  function profileAgeBand(age){
    if(age===null||age===undefined||Number.isNaN(age))return "Unknown";
    if(age<1)return "0–11 mos.";
    if(age<=4)return "1–4";
    if(age<=9)return "5–9";
    if(age<=14)return "10–14";
    if(age<=19)return "15–19";
    if(age<=49)return "20–49";
    if(age<=59)return "50–59";
    return "60 and above";
  }

  function ageFromBirthdate(birthdate,interviewDate){
    if(blank(birthdate))return null;
    const b=new Date(`${normalize(birthdate)}T12:00:00`);
    const ref=interviewDate?new Date(`${normalize(interviewDate)}T12:00:00`):new Date();
    if(Number.isNaN(b.getTime())||Number.isNaN(ref.getTime())||b>ref)return null;
    let age=ref.getFullYear()-b.getFullYear();
    const md=ref.getMonth()-b.getMonth();
    if(md<0||(md===0&&ref.getDate()<b.getDate()))age--;
    return age>=0&&age<=120?age:null;
  }


  function ageMonthsFromBirthdate(birthdate,interviewDate){
    if(blank(birthdate))return null;
    const b=new Date(`${normalize(birthdate)}T12:00:00`);
    const ref=interviewDate?new Date(`${normalize(interviewDate)}T12:00:00`):new Date();
    if(Number.isNaN(b.getTime())||Number.isNaN(ref.getTime())||b>ref)return null;
    let months=(ref.getFullYear()-b.getFullYear())*12+(ref.getMonth()-b.getMonth());
    if(ref.getDate()<b.getDate())months--;
    return months>=0&&months<=1440?months:null;
  }

  function exactOrEstimatedAgeMonths(person){
    const exact=ageMonthsFromBirthdate(person.birthdate,person.interviewDate);
    if(exact!==null)return {months:exact,source:"birthdate"};
    if(person.age===0)return {months:0,source:"age-fallback"};
    if(person.age===1)return {months:12,source:"age-fallback"};
    return {months:null,source:"unknown"};
  }

  function cleanProfileAge(typedAge,birthdate,interviewDate,audit){
    const typed=numericValue(typedAge);
    const dobAge=ageFromBirthdate(birthdate,interviewDate);
    if(typed!==null&&(typed<0||typed>120)){
      audit.invalidAges++;
    }
    const validTyped=typed!==null&&typed>=0&&typed<=120?typed:null;
    if(dobAge!==null&&validTyped!==null&&Math.abs(dobAge-validTyped)>1){
      audit.ageConflicts++;
    }
    return dobAge!==null?dobAge:validTyped;
  }

  function canonicalSex(value){
    const s=basicCategoryKey(value);
    if(s==="male"||s==="m")return "Male";
    if(s==="female"||s==="f")return "Female";
    if(!s)return "Unknown / not stated";
    return "Other / not stated";
  }

  function profileIdentityKey(p){
    const n=basicCategoryKey(p.name);
    const bd=normalize(p.birthdate);
    const sex=canonicalSex(p.sex);
    if(n&&bd)return `${n}|${bd}|${sex}`;
    if(n&&p.age!==null)return `${n}|age:${p.age}|${sex}`;
    return "";
  }

  function getPopulationBundle(){
    const raw=[];
    const audit={duplicatesRemoved:0,invalidAges:0,ageConflicts:0,missingAge:0,missingSex:0};
    filteredRecords.forEach((r,recordIndex)=>{
      const j=r.response_json||{};
      const hh=r.household_code||j.household_number||`Household ${recordIndex+1}`;
      const interviewDate=r.interview_date||j.interview_date||"";
      const headName=normalize(j.head_name);
      const headBirthdate=normalize(j.head_birthdate);
      const headAge=cleanProfileAge(j.head_age,headBirthdate,interviewDate,audit);

      if(headName||headAge!==null||!blank(j.head_sex)||headBirthdate){
        raw.push({
          household:hh,recordIndex,role:"Household Head",name:headName,birthdate:headBirthdate,
          age:headAge,sex:normalize(j.head_sex),civil_status:normalize(j.head_civil_status),
          education:normalize(j.head_education),occupation:normalize(j.head_occupation),
          employment:normalize(j.head_employment_status),pregnancy_status:normalize(j.head_pregnancy_status),
          interviewDate,source:"head"
        });
      }

      const members=Array.isArray(j.family_members)?j.family_members:[];
      members.forEach(m=>{
        const birthdate=normalize(m.birthdate);
        const age=cleanProfileAge(m.age,birthdate,interviewDate,audit);
        if(blank(m.name)&&age===null&&blank(m.sex)&&blank(birthdate))return;
        raw.push({
          household:hh,recordIndex,role:normalize(m.relation)||"Household Member",
          name:normalize(m.name),birthdate,age,sex:normalize(m.sex),
          civil_status:normalize(m.civil_status),education:normalize(m.education),
          occupation:normalize(m.occupation),employment:normalize(m.employment_status),
          pregnancy_status:normalize(m.pregnancy_status),interviewDate,source:"member"
        });
      });
    });

    const deduped=[];
    const seenByHousehold=new Map();
    raw.forEach(p=>{
      const id=profileIdentityKey(p);
      const headLike=/^(self|self household head|household head)$/i.test(basicCategoryKey(p.role));
      if(!seenByHousehold.has(p.recordIndex))seenByHousehold.set(p.recordIndex,new Map());
      const seen=seenByHousehold.get(p.recordIndex);

      if(id&&seen.has(id)){
        const previous=seen.get(id);
        if(headLike||previous.source==="head"||p.source===previous.source){
          audit.duplicatesRemoved++;
          return;
        }
      }
      deduped.push(p);
      if(id)seen.set(id,p);
    });

    deduped.forEach(p=>{
      p.sex_group=canonicalSex(p.sex);
      p.age_band=profileAgeBand(p.age);
      const monthAge=exactOrEstimatedAgeMonths(p);
      p.age_months=monthAge.months;
      p.age_months_source=monthAge.source;
      if(p.age===null)audit.missingAge++;
      if(p.sex_group==="Unknown / not stated")audit.missingSex++;
    });

    return {people:deduped,audit,rawCount:raw.length};
  }

  function getPopulationProfiles(){
    return getPopulationBundle().people;
  }

  function profileKpi(label,value,sub=""){
    return `<article class="profile-kpi"><span>${safe(label)}</span><strong>${safe(value)}</strong><small>${safe(sub)}</small></article>`;
  }

  function profileCard(title,body,sub="",wide=false){
    return `<article class="profile-card ${wide?"wide":""}"><h3>${safe(title)}</h3>${sub?`<div class="profile-sub">${safe(sub)}</div>`:""}${body}</article>`;
  }

  function populationPyramid(people){
    const male=Object.fromEntries(PROFILE_AGE_BANDS.map(x=>[x,0]));
    const female=Object.fromEntries(PROFILE_AGE_BANDS.map(x=>[x,0]));
    const other=Object.fromEntries(PROFILE_AGE_BANDS.map(x=>[x,0]));

    people.forEach(p=>{
      const band=p.age_band||profileAgeBand(p.age);
      if(!PROFILE_AGE_BANDS.includes(band))return;
      const sex=p.sex_group||canonicalSex(p.sex);
      if(sex==="Male")male[band]++;
      else if(sex==="Female")female[band]++;
      else other[band]++;
    });

    const max=Math.max(1,...PROFILE_AGE_BANDS.flatMap(b=>[male[b],female[b]]));
    const rows=[...PROFILE_AGE_BANDS].reverse().map(b=>{
      const mw=Math.round(male[b]/max*100),fw=Math.round(female[b]/max*100);
      const total=male[b]+female[b]+other[b];
      return `<div class="pyramid-row">
        <span class="pyramid-side male traceable-data"${traceData({kind:"population-age-sex",value:b,sex:"Male"})}><i style="width:${mw}%">${male[b]||""}</i></span>
        <span class="age-band traceable-data"${traceData({kind:"population-age",value:b})}><b>${total}</b><em>${b}</em>${other[b]?`<small>+${other[b]} sex not stated/other</small>`:""}</span>
        <span class="pyramid-side female traceable-data"${traceData({kind:"population-age-sex",value:b,sex:"Female"})}><i style="width:${fw}%">${female[b]||""}</i></span>
      </div>`;
    }).join("");

    const maleTotal=Object.values(male).reduce((a,b)=>a+b,0);
    const femaleTotal=Object.values(female).reduce((a,b)=>a+b,0);
    const otherTotal=Object.values(other).reduce((a,b)=>a+b,0);
    const knownAge=maleTotal+femaleTotal+otherTotal;

    return `<div class="population-pyramid">
      <div class="pyramid-header"><span>Male</span><span>Total · Age</span><span>Female</span></div>
      ${rows}
      <div class="pyramid-footer">
        <span><b>${maleTotal}</b> male</span>
        <span><b>${femaleTotal}</b> female</span>
        <span><b>${otherTotal}</b> other/not stated</span>
        <span><b>${knownAge}</b> known age total</span>
      </div>
    </div>`;
  }

  function simpleDistribution(values,limit=Infinity,traceBase=null){
    const vals=values.filter(v=>!blank(v));
    return renderBars(counts(vals),vals.length,Infinity,traceBase);
  }

  function matrixChart(people,rowFn,colField,rowOrder=null,colLimit=7){
    const rows=rowOrder||[...new Set(people.map(rowFn).filter(Boolean))];
    const colCounts=counts(people.map(p=>p[colField]).filter(v=>!blank(v)));
    const cols=colCounts.map(x=>x.label);
    if(!rows.length||!cols.length)return '<div class="profile-empty">Not enough data for this matrix.</div>';
    const table={};
    let max=0;
    rows.forEach(r=>{table[r]={};cols.forEach(c=>table[r][c]=0);});
    people.forEach(p=>{
      const r=rowFn(p),c=p[colField];
      if(!table[r]||blank(c))return;
      const col=cols.find(x=>x.toLowerCase()===normalize(c).toLowerCase());
      if(!col)return;
      table[r][col]++;
      max=Math.max(max,table[r][col]);
    });
    const head=`<tr><th></th>${cols.map(c=>`<th>${safe(c)}</th>`).join("")}</tr>`;
    const body=rows.map(r=>`<tr><th class="row-label">${safe(r)}</th>${cols.map(c=>{
      const n=table[r][c]||0;
      const heat=max?(.08+.72*n/max):.05;
      return `<td class="${n?"":"zero"}" style="--heat:${heat.toFixed(2)}">${n||"—"}</td>`;
    }).join("")}</tr>`).join("");
    return `<div class="matrix-wrap"><table class="profile-matrix"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  function householdSizeDistribution(people){
    const countsByRecord=new Map();
    people.forEach(p=>countsByRecord.set(p.recordIndex,(countsByRecord.get(p.recordIndex)||0)+1));
    const sizes=[...countsByRecord.values()];
    if(!sizes.length)return '<div class="profile-empty">No household member profiles yet.</div>';
    const categories=sizes.map(n=>n<=2?"1–2":n<=4?"3–4":n<=6?"5–6":"7+");
    return simpleDistribution(categories);
  }

  function dependencyStats(people){
    const known=people.filter(p=>p.age!==null);
    const young=known.filter(p=>p.age<15).length;
    const working=known.filter(p=>p.age>=15&&p.age<=64).length;
    const older=known.filter(p=>p.age>=65).length;
    const ratio=working?Math.round((young+older)/working*100):null;
    return {young,working,older,ratio,known:known.length};
  }

  function repeaterValues(type,field){
    return repeaterRows(type).map(r=>r[field]).filter(v=>!blank(v));
  }

  function yesNoMini(title,vals,traceBase=null){
    return profileCard(title,binaryChart(vals,traceBase),`${answeredCount(vals)} answered`);
  }

  function vitalsProfileCards(){
    const rows=repeaterRows("adult_vitals");
    const specs=[
      ["bp_systolic","Systolic BP"],["bp_diastolic","Diastolic BP"],
      ["pulse_rate","Pulse rate"],["respiratory_rate","Respiratory rate"],
      ["temperature_c","Temperature"],["spo2","SpO₂"]
    ];
    return specs.map(([field,label])=>profileCard(label,numericChart(rows.map(r=>r[field]).filter(v=>!blank(v))),`${rows.length} adult vital row(s)`)).join("");
  }

  function illnessByAge(){
    const rows=repeaterRows("illnesses");
    const bands=[];
    rows.forEach(r=>{
      const age=numericValue(r.age);
      const illness=normalize(r.illness);
      if(age===null||!illness)return;
      bands.push(`${profileAgeBand(age)} · ${illness}`);
    });
    return simpleDistribution(bands);
  }

  function zoneComparison(){
    const groups=new Map();
    filteredRecords.forEach(r=>{
      const zone=normalize(r.zone)||"Unspecified";
      if(!groups.has(zone))groups.set(zone,[]);
      groups.get(zone).push(r);
    });
    if(!groups.size)return '<div class="profile-empty">No zone data recorded.</div>';

    const rate=(records,key,test=v=>/^yes$/i.test(normalize(v)))=>{
      const vals=records.map(r=>r.response_json?.[key]).filter(v=>!blank(v));
      return vals.length?pct(vals.filter(test).length,vals.length):0;
    };
    const treated=records=>{
      const vals=records.map(r=>r.response_json?.water_treatment).filter(v=>!blank(v));
      const n=vals.filter(v=>!/^(no treatment|none|no)$/i.test(normalize(v))).length;
      return vals.length?pct(n,vals.length):0;
    };

    const header=`<div class="zone-row header"><span>Zone</span><span>n</span><span>Toilet</span><span>Treated water</span><span>Org involvement</span></div>`;
    const rows=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length).map(([zone,records])=>{
      const toilet=rate(records,"with_toilet"),water=treated(records),org=rate(records,"community_org_involvement");
      const metric=p=>`<span class="zone-metric"><span class="progress-track"><i style="width:${p}%"></i></span><small>${p}%</small></span>`;
      return `<div class="zone-row"><span class="zone-name">${safe(zone)}</span><span class="zone-count">${records.length}</span>${metric(toilet)}${metric(water)}${metric(org)}</div>`;
    }).join("");
    return `<div class="zone-compare">${header}${rows}</div>`;
  }

  function topCommunityProblems(){
    const vals=repeaterRows("problems").map(r=>r.problem).filter(v=>!blank(v));
    return simpleDistribution(vals);
  }


  function populationAudit(){
    const bundle=getPopulationBundle();
    const people=bundle.people;
    const knownAge=people.filter(p=>p.age!==null);
    const ageCounts=Object.fromEntries(PROFILE_AGE_BANDS.map(b=>[b,0]));
    knownAge.forEach(p=>{if(ageCounts[p.age_band]!==undefined)ageCounts[p.age_band]++;});
    const ageSum=Object.values(ageCounts).reduce((a,b)=>a+b,0);

    const sexCounts={
      "Male":people.filter(p=>p.sex_group==="Male").length,
      "Female":people.filter(p=>p.sex_group==="Female").length,
      "Other / not stated":people.filter(p=>p.sex_group==="Other / not stated").length,
      "Unknown / not stated":people.filter(p=>p.sex_group==="Unknown / not stated").length
    };
    const sexSum=Object.values(sexCounts).reduce((a,b)=>a+b,0);

    const under5=knownAge.filter(p=>p.age<5).length;
    const under5Bands=(ageCounts["0–11 mos."]||0)+(ageCounts["1–4"]||0);
    const under15=knownAge.filter(p=>p.age<15).length;
    const under15Bands=(ageCounts["0–11 mos."]||0)+(ageCounts["1–4"]||0)+(ageCounts["5–9"]||0)+(ageCounts["10–14"]||0);
    const dep=dependencyStats(people);
    const dependencySum=dep.young+dep.working+dep.older;

    const byHouse=new Map();
    people.forEach(p=>byHouse.set(p.recordIndex,(byHouse.get(p.recordIndex)||0)+1));
    const householdProfileSum=[...byHouse.values()].reduce((a,b)=>a+b,0);

    const checks=[
      {
        label:"Children 0–23 months = 0–11 + 12–23",
        pass:infant023Stats().total===infant023Stats().infant011+infant023Stats().child1223,
        detail:"Checks the denominator used for infant and young-child indicators.",
        values:`0–23 mo ${infant023Stats().total} · Subgroups ${infant023Stats().infant011+infant023Stats().child1223}`
      },

      {
        label:"Population total = sex categories",
        pass:people.length===sexSum,
        detail:"Every canonical household member should fall into Male, Female, Other, or Unknown.",
        values:`Population ${people.length} · Sex categories ${sexSum}`
      },
      {
        label:"Known-age total = sum of age bands",
        pass:knownAge.length===ageSum,
        detail:"The population pyramid and age-structure graph now use this same age-band source.",
        values:`Known age ${knownAge.length} · Age bands ${ageSum}`
      },
      {
        label:"Under-5 count = 0–11 mos. + 1–4",
        pass:under5===under5Bands,
        detail:"This specifically checks the discrepancy you noticed.",
        values:`Under 5 ${under5} · Bands ${under5Bands}`
      },
      {
        label:"Age <15 = pediatric age bands",
        pass:under15===under15Bands,
        detail:"Checks 0–11 mos., 1–4, 5–9, and 10–14 against the derived age threshold.",
        values:`Age <15 ${under15} · Bands ${under15Bands}`
      },
      {
        label:"Dependency groups = known-age population",
        pass:dependencySum===knownAge.length,
        detail:"Young (<15), working age (15–64), and older (65+) must reconcile.",
        values:`Groups ${dependencySum} · Known age ${knownAge.length}`
      },
      {
        label:"Household profile sizes = population total",
        pass:householdProfileSum===people.length,
        detail:"All canonical members are counted once across household-size calculations.",
        values:`Household sum ${householdProfileSum} · Population ${people.length}`
      }
    ];

    return {bundle,people,knownAge,ageCounts,sexCounts,checks};
  }

  function auditProfile(){
    const a=populationAudit();
    const failed=a.checks.filter(x=>!x.pass).length;
    const warnings=
      a.bundle.audit.missingAge+
      a.bundle.audit.missingSex+
      a.bundle.audit.ageConflicts+
      a.bundle.audit.invalidAges;

    const summary=`<div class="audit-summary">
      <article class="audit-stat"><span>Core checks</span><strong>${a.checks.length-failed}/${a.checks.length}</strong><small>reconciled</small></article>
      <article class="audit-stat"><span>Canonical population</span><strong>${a.people.length}</strong><small>${a.bundle.rawCount} raw profile row(s)</small></article>
      <article class="audit-stat"><span>Duplicates removed</span><strong>${a.bundle.audit.duplicatesRemoved}</strong><small>exact/same-member duplicates</small></article>
      <article class="audit-stat"><span>Data warnings</span><strong>${warnings}</strong><small>missing/conflicting age or sex</small></article>
    </div>`;

    const checkRows=`<div class="audit-list">${a.checks.map(c=>`<div class="audit-row ${c.pass?"pass":"fail"}">
      <span class="audit-icon">${c.pass?"✓":"!"}</span>
      <div><strong>${safe(c.label)}</strong><p>${safe(c.detail)}</p></div>
      <div class="audit-values">${safe(c.values)}</div>
    </div>`).join("")}</div>`;

    const ageRows=PROFILE_AGE_BANDS.map(b=>`<tr><td>${safe(b)}</td><td class="num">${a.ageCounts[b]||0}</td></tr>`).join("");
    const sexRows=Object.entries(a.sexCounts).map(([k,v])=>`<tr><td>${safe(k)}</td><td class="num">${v}</td></tr>`).join("");

    const qualityRows=[
      ["Missing age",a.bundle.audit.missingAge],
      ["Missing sex",a.bundle.audit.missingSex],
      ["Entered age vs birthdate conflict (>1 year)",a.bundle.audit.ageConflicts],
      ["Invalid entered age (<0 or >120)",a.bundle.audit.invalidAges],
      ["Duplicate profile rows removed",a.bundle.audit.duplicatesRemoved]
    ].map(([k,v])=>`<tr><td>${safe(k)}</td><td class="num">${v}</td></tr>`).join("");

    return `${summary}${checkRows}
      <div class="profile-grid three" style="margin-top:8px">
        ${profileCard("Canonical Age-Band Counts",`<table class="audit-table"><thead><tr><th>Age band</th><th>n</th></tr></thead><tbody>${ageRows}<tr><th>Total known age</th><th class="num">${a.knownAge.length}</th></tr></tbody></table>`,"Same source used by Age Structure and Population Pyramid")}
        ${profileCard("Canonical Sex Counts",`<table class="audit-table"><thead><tr><th>Sex category</th><th>n</th></tr></thead><tbody>${sexRows}<tr><th>Total population</th><th class="num">${a.people.length}</th></tr></tbody></table>`,"Unknown/other is retained instead of silently dropped")}
        ${profileCard("Data Quality Flags",`<table class="audit-table"><thead><tr><th>Check</th><th>n</th></tr></thead><tbody>${qualityRows}</tbody></table>`,"Review these before final paper submission")}
      </div>
      <div class="audit-note"><strong>Important:</strong> Birthdate, when available, is now the preferred source for age at the interview date. Entered age is used only as fallback. All population-level visuals use the same deduplicated member list and the same age bands.</div>`;
  }

  function overviewProfile(){
    const people=getPopulationProfiles();
    const dep=dependencyStats(people);
    const pregnant=people.filter(p=>/^currently pregnant$/i.test(p.pregnancy_status)).length;
    const under5=people.filter(p=>p.age!==null&&p.age<5).length;
    const older=people.filter(p=>p.age!==null&&p.age>=60).length;
    const hh=filteredRecords.length;
    const avg=hh?people.length/hh:0;

    const kpis=`<div class="profile-kpis">
      ${profileKpi("Population",people.length,"profiled members")}
      ${profileKpi("Avg. household size",fmt(avg,1),"profiled people / household")}
      ${profileKpi("Under 5",under5,"profiled children")}
      ${profileKpi("Age 60 and above",older,"profiled older adults")}
      ${profileKpi("Pregnant",pregnant,"marked currently pregnant")}
      ${profileKpi("Dependency ratio",dep.ratio===null?"—":`${dep.ratio}`,"dependents per 100 ages 15–64")}
    </div>`;

    const ageDist=people.map(p=>p.age_band||profileAgeBand(p.age)).filter(x=>x!=="Unknown");
    const income=topValues("family_income_bracket");
    const illness=repeaterRows("illnesses").map(r=>r.illness).filter(v=>!blank(v));

    return `${kpis}<div class="profile-grid">
      ${profileCard("Population Pyramid",populationPyramid(people),"Age × sex",true)}
      ${profileCard("Age Structure",simpleDistribution(ageDist,Infinity,{kind:"population-age"}),"Profiled household members")}
      ${profileCard("Household Size",householdSizeDistribution(people),"Based on listed household profiles")}
      ${profileCard("Family Income",renderBars(counts(income),answeredCount(income),Infinity,{kind:"field",path:"family_income_bracket",type:"categorical"}),"Household distribution")}
      ${profileCard("Reported Illnesses",simpleDistribution(illness,Infinity,{kind:"repeater-field",path:"illnesses.illness",type:"categorical"}),"From illness records")}
    </div>
    <div class="profile-note"><strong>Derived view:</strong> population totals depend on household head + family members entered in the survey. Missing member profiles are not imputed.</div>`;
  }

  function populationProfile(){
    const people=getPopulationProfiles();
    const sex=people.map(p=>p.sex_group||canonicalSex(p.sex));
    const age=people.map(p=>p.age_band||profileAgeBand(p.age)).filter(x=>x!=="Unknown");
    const civil=people.filter(p=>!blank(p.civil_status));
    const edu=people.filter(p=>!blank(p.education));
    const occupation=people.map(p=>p.occupation).filter(v=>!blank(v));
    const dep=dependencyStats(people);

    const kpis=`<div class="profile-kpis">
      ${profileKpi("Known age",dep.known,`${people.length} profiles total`)}
      ${profileKpi("Age <15",dep.young,"younger population")}
      ${profileKpi("Age 15–64",dep.working,"working-age band")}
      ${profileKpi("Age 65+",dep.older,"older dependents")}
      ${profileKpi("Dependency ratio",dep.ratio===null?"—":dep.ratio,"per 100 ages 15–64")}
      ${profileKpi("Sex recorded",sex.length,"member profiles")}
    </div>`;

    return `${kpis}<div class="profile-grid">
      ${profileCard("Population Pyramid",populationPyramid(people),"Male and female age structure",true)}
      ${profileCard("Age Group Distribution",simpleDistribution(age,Infinity,{kind:"population-age"}),"All profiled members")}
      ${profileCard("Sex Distribution",simpleDistribution(sex,Infinity,{kind:"population-field",field:"sex_group"}),"All profiled members")}
      ${profileCard("Civil Status × Age Group",matrixChart(civil,p=>profileAgeBand(p.age),"civil_status",PROFILE_AGE_BANDS),"Counts among members with both age and civil status",true)}
      ${profileCard("Education × Age Group",matrixChart(edu,p=>profileAgeBand(p.age),"education",PROFILE_AGE_BANDS),"Top educational attainment categories",true)}
      ${profileCard("Common Occupations",simpleDistribution(occupation,Infinity,{kind:"population-field",field:"occupation"}),"Household head + member occupations")}
    </div>`;
  }


  function infant023Stats(){
    const people=getPopulationProfiles();
    const eligible=people.filter(p=>p.age_months!==null&&p.age_months>=0&&p.age_months<=23);
    const infant011=eligible.filter(p=>p.age_months<=11);
    const child1223=eligible.filter(p=>p.age_months>=12&&p.age_months<=23);
    const exact=eligible.filter(p=>p.age_months_source==="birthdate");
    const fallback=eligible.filter(p=>p.age_months_source==="age-fallback");
    return {total:eligible.length,infant011:infant011.length,child1223:child1223.length,exact:exact.length,fallback:fallback.length};
  }

  function infant023Card(){
    const s=infant023Stats();
    return profileCard(
      "Children 0–23 Months",
      `<div class="infant-age-breakdown">
        <div class="infant-age-stat traceable-data"${traceData({kind:"population-month-range",label:"Children 0–23 months",min:0,max:23})}><span>Total 0–23 months</span><strong>${s.total}</strong><small>Eligible population</small></div>
        <div class="infant-age-stat traceable-data"${traceData({kind:"population-month-range",label:"Children 0–11 months",min:0,max:11})}><span>0–11 months</span><strong>${s.infant011}</strong><small>Infants</small></div>
        <div class="infant-age-stat traceable-data"${traceData({kind:"population-month-range",label:"Children 12–23 months",min:12,max:23})}><span>12–23 months</span><strong>${s.child1223}</strong><small>Young children</small></div>
      </div>
      <div class="infant-method-note"><strong>Age source:</strong> ${s.exact} exact from birthdate + interview date; ${s.fallback} from recorded age fallback.</div>`,
      "Use this denominator for indicators requiring the 0–23-month population",
      true
    );
  }


  const RANKED_FIELD_ALIASES={
    services:new Map(Object.entries({
      "rhu":"Rural Health Unit",
      "rural health unit":"Rural Health Unit",
      "bhs":"Barangay Health Station",
      "barangay health station":"Barangay Health Station",
      "public hospital":"Public Hospital",
      "government hospital":"Public Hospital",
      "private hospital":"Private Hospital",
      "private clinic":"Private Clinic",
      "clinic":"Private Clinic"
    })),
    workers:new Map(Object.entries({
      "doctor":"Doctor / Physician",
      "physician":"Doctor / Physician",
      "md":"Doctor / Physician",
      "nurse":"Nurse",
      "midwife":"Midwife / RHM",
      "rhm":"Midwife / RHM",
      "rural health midwife":"Midwife / RHM",
      "bhw":"Barangay Health Worker",
      "barangay health worker":"Barangay Health Worker",
      "albularyo":"Albularyo / Traditional Healer",
      "medicine man":"Albularyo / Traditional Healer",
      "traditional healer":"Albularyo / Traditional Healer"
    })),
    interventions:new Map(Object.entries({
      "self medication":"Self-medication",
      "self medicate":"Self-medication",
      "self medicated":"Self-medication",
      "albularyo":"Consulted Albularyo / Traditional Healer",
      "medicine man":"Consulted Albularyo / Traditional Healer",
      "traditional healer":"Consulted Albularyo / Traditional Healer",
      "rhm":"Consulted RHM / Midwife",
      "midwife":"Consulted RHM / Midwife",
      "nurse":"Consulted Nurse",
      "doctor":"Consulted Doctor / Physician",
      "physician":"Consulted Doctor / Physician",
      "hospital":"Went to Hospital",
      "went to hospital":"Went to Hospital",
      "immediately went to hospital":"Went to Hospital"
    }))
  };

  function cleanRankedItem(value,kind){
    let s=normalize(value);
    if(!s)return "";
    s=s.replace(/^(?:rank\s*)?#?\s*\d+\s*(?:st|nd|rd|th)?\s*[\.\)\-:–—]*\s*/i,"");
    s=s.replace(/^[•\-–—]\s*/,"").trim();
    if(!s)return "";
    const key=basicCategoryKey(s);
    const alias=RANKED_FIELD_ALIASES[kind]?.get(key);
    return alias||prettyCategory(s);
  }

  function splitRankedText(raw,kind){
    if(blank(raw))return [];
    if(Array.isArray(raw)){
      return raw.flatMap(v=>splitRankedText(v,kind));
    }
    let text=normalize(raw);
    // Separate common inline ranking patterns such as "1 RHU 2 BHS 3 Public Hospital".
    text=text.replace(/\s+(?=(?:#?\d+\s*[\.\)\-:–—]?\s*)[A-Za-z])/g," | ");
    const parts=text.split(/\r?\n|;|\||,/).map(v=>cleanRankedItem(v,kind)).filter(Boolean);
    const unique=[];
    parts.forEach(v=>{
      if(!unique.some(x=>sameCanonical(x,v)))unique.push(v);
    });
    return unique;
  }

  function rankedHouseholdTally(field,kind){
    const groups=[];
    let answeredHouseholds=0;
    filteredRecords.forEach((record,recordIndex)=>{
      const raw=record.response_json?.[field];
      const items=splitRankedText(raw,kind);
      if(!items.length)return;
      answeredHouseholds++;
      items.forEach(item=>{
        const c=canonicalCategory(item);
        let g=groups.find(x=>nearSameCategory(x.key,c.key));
        if(!g){
          g={key:c.key,label:item,count:0,variants:new Set()};
          groups.push(g);
        }
        g.count++;
        g.variants.add(normalize(raw));
      });
    });
    return {
      answeredHouseholds,
      items:groups.map(g=>({label:g.label,count:g.count,variants:[...g.variants]}))
        .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))
    };
  }

  function tallyTable(items,denom,traceBase,basisLabel){
    if(!items.length)return '<div class="profile-empty">No recorded data.</div>';
    return `<table class="tally-table">
      <thead><tr><th>Category</th><th class="num">n</th><th class="num">%</th></tr></thead>
      <tbody>${items.map(item=>{
        const trace=makeTraceSpec(traceBase,item.label,{variants:item.variants||[]});
        return `<tr class="${trace?"traceable-data":""}"${traceData(trace)}>
          <td>${safe(item.label)}</td>
          <td class="num">${item.count}</td>
          <td class="num">${denom?pct(item.count,denom):0}%</td>
        </tr>`;
      }).join("")}
      <tr class="tally-total-row"><td>${safe(basisLabel||"Denominator")}</td><td class="num">${denom}</td><td class="num">100%</td></tr>
      </tbody>
    </table>`;
  }

  function compressedHealthTallyData(){
    const infant=infant023Stats();

    const illnessRows=repeaterRows("illnesses");
    const morbidity=counts(illnessRows.map(r=>r.illness).filter(v=>!blank(v)));

    const deathRows=repeaterRows("deaths");
    const mortality=counts(deathRows.map(r=>r.cause).filter(v=>!blank(v)));

    const interventions=rankedHouseholdTally("health_interventions_rank","interventions");
    const services=rankedHouseholdTally("health_services_rank","services");
    const workers=rankedHouseholdTally("health_worker_rank","workers");

    return {infant,illnessRows,morbidity,deathRows,mortality,interventions,services,workers};
  }

  function compressedHealthTally(){
    const d=compressedHealthTallyData();

    return `<section class="compressed-health-tally">
      <div class="compressed-tally-head">
        <div>
          <h3>Compressed Health Tally</h3>
          <p>Summary requested for consolidation across households. Click any category to trace it back to the source survey.</p>
        </div>
        <div class="compressed-tally-actions">
          <button type="button" id="download-compressed-health-csv">↓ Download CSV</button>
        </div>
      </div>

      <div class="compressed-tally-grid">
        <article class="tally-card wide">
          <h4>Population 0–23 Months</h4>
          <p class="tally-basis">Canonical deduplicated population; birthdate + interview date preferred for exact month age.</p>
          <table class="tally-table">
            <thead><tr><th>Age group</th><th class="num">Population</th></tr></thead>
            <tbody>
              <tr class="traceable-data"${traceData({kind:"population-month-range",label:"Children 0–11 months",min:0,max:11})}><td>0–11 months</td><td class="num">${d.infant.infant011}</td></tr>
              <tr class="traceable-data"${traceData({kind:"population-month-range",label:"Children 12–23 months",min:12,max:23})}><td>12–23 months</td><td class="num">${d.infant.child1223}</td></tr>
              <tr class="tally-total-row traceable-data"${traceData({kind:"population-month-range",label:"Children 0–23 months",min:0,max:23})}><td>Total 0–23 months</td><td class="num">${d.infant.total}</td></tr>
            </tbody>
          </table>
        </article>

        <article class="tally-card">
          <h4>Morbidity — All Reported Illnesses</h4>
          <p class="tally-basis">Frequency is based on illness records, not unique households.</p>
          ${tallyTable(d.morbidity,d.illnessRows.length,{kind:"repeater-field",path:"illnesses.illness",type:"categorical"},"Total illness records")}
        </article>

        <article class="tally-card">
          <h4>Mortality — All Reported Causes</h4>
          <p class="tally-basis">Frequency is based on recorded death/cause rows.</p>
          ${tallyTable(d.mortality,d.deathRows.length,{kind:"repeater-field",path:"deaths.cause",type:"categorical"},"Total death records")}
        </article>

        <article class="tally-card">
          <h4>Interventions Used During Illness</h4>
          <p class="tally-basis">n = households mentioning the item; percentages use households that answered this field. Multiple responses are allowed, so percentages may total more than 100%.</p>
          ${tallyTable(d.interventions.items,d.interventions.answeredHouseholds,{kind:"ranked-field-item",path:"health_interventions_rank",parseKind:"interventions"},"Households with response")}
        </article>

        <article class="tally-card">
          <h4>Frequently Availed Health Services</h4>
          <p class="tally-basis">n = households mentioning the service; percentages use households that answered this field. Multiple services may be listed.</p>
          ${tallyTable(d.services.items,d.services.answeredHouseholds,{kind:"ranked-field-item",path:"health_services_rank",parseKind:"services"},"Households with response")}
        </article>

        <article class="tally-card wide">
          <h4>Preferred Health Worker</h4>
          <p class="tally-basis">n = households mentioning the health worker; percentages use households that answered this field. Multiple preferences may be listed.</p>
          ${tallyTable(d.workers.items,d.workers.answeredHouseholds,{kind:"ranked-field-item",path:"health_worker_rank",parseKind:"workers"},"Households with response")}
        </article>
      </div>

      <div class="tally-note"><strong>Important:</strong> The three ranking/text fields were originally entered as free text. This summary conservatively splits common comma-, semicolon-, line-, and rank-separated entries and groups obvious abbreviations such as RHU/Rural Health Unit and BHS/Barangay Health Station. Original survey responses are never changed.</div>
    </section>`;
  }

  function exportCompressedHealthTally(){
    const d=compressedHealthTallyData();
    const rows=[["Indicator","Category","Frequency","Denominator","Percent","Basis"]];

    rows.push(["Population 0–23 months","0–11 months",d.infant.infant011,d.infant.total,d.infant.total?pct(d.infant.infant011,d.infant.total):0,"Population"]);
    rows.push(["Population 0–23 months","12–23 months",d.infant.child1223,d.infant.total,d.infant.total?pct(d.infant.child1223,d.infant.total):0,"Population"]);
    rows.push(["Population 0–23 months","Total 0–23 months",d.infant.total,d.infant.total,100,"Population"]);

    d.morbidity.forEach(x=>rows.push(["Morbidity",x.label,x.count,d.illnessRows.length,d.illnessRows.length?pct(x.count,d.illnessRows.length):0,"Illness records"]));
    d.mortality.forEach(x=>rows.push(["Mortality",x.label,x.count,d.deathRows.length,d.deathRows.length?pct(x.count,d.deathRows.length):0,"Death records"]));
    d.interventions.items.forEach(x=>rows.push(["Interventions used during illness",x.label,x.count,d.interventions.answeredHouseholds,d.interventions.answeredHouseholds?pct(x.count,d.interventions.answeredHouseholds):0,"Households with response"]));
    d.services.items.forEach(x=>rows.push(["Frequently availed health services",x.label,x.count,d.services.answeredHouseholds,d.services.answeredHouseholds?pct(x.count,d.services.answeredHouseholds):0,"Households with response"]));
    d.workers.items.forEach(x=>rows.push(["Preferred health worker",x.label,x.count,d.workers.answeredHouseholds,d.workers.answeredHouseholds?pct(x.count,d.workers.answeredHouseholds):0,"Households with response"]));

    const csv="\uFEFF"+rows.map(r=>r.map(csvEscape).join(",")).join("\r\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`alang-alang-compressed-health-tally-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function healthProfile(){
    const people=getPopulationProfiles();
    const pregnant=people.filter(p=>/^currently pregnant$/i.test(p.pregnancy_status)).length;
    const under5=people.filter(p=>p.age!==null&&p.age<5).length;
    const infant023=infant023Stats();
    const adults=people.filter(p=>p.age!==null&&p.age>=18).length;
    const illnessRows=repeaterRows("illnesses");
    const deathRows=repeaterRows("deaths");

    const bf=repeaterValues("breastfeeding","exclusive_6mo");
    const supp=repeaterValues("supplementary_feeding","supplementary_feeding");
    const weightStatus=repeaterValues("nutrition_children","weight_status");
    const heightStatus=repeaterValues("nutrition_children","height_status");
    const immunStatus=repeaterValues("immunization_children","status");
    const illnesses=illnessRows.map(r=>r.illness).filter(v=>!blank(v));
    const illnessSex=illnessRows.map(r=>r.sex).filter(v=>!blank(v));
    const causes=deathRows.map(r=>r.cause).filter(v=>!blank(v));
    const phil=repeaterValues("philhealth_members","type");

    const kpis=`<div class="profile-kpis">
      ${profileKpi("Adults 18+",adults,"profiled members")}
      ${profileKpi("Children <5",under5,"profiled members")}
      ${profileKpi("Children 0–23 mo.",infant023.total,"eligible population")}
      ${profileKpi("Pregnant",pregnant,"marked currently pregnant")}
      ${profileKpi("Illness records",illnessRows.length,"survey rows")}
      ${profileKpi("Death records",deathRows.length,"survey rows")}
    </div>`;

    return `${compressedHealthTally()}${kpis}<div class="profile-grid three">
      ${infant023Card()}
      ${yesNoMini("Exclusive Breastfeeding 6 Months",bf,{kind:"repeater-field",path:"breastfeeding.exclusive_6mo",type:"binary"})}
      ${yesNoMini("Supplementary Feeding",supp,{kind:"repeater-field",path:"supplementary_feeding.supplementary_feeding",type:"binary"})}
      ${profileCard("Child Weight Status",simpleDistribution(weightStatus,Infinity,{kind:"repeater-field",path:"nutrition_children.weight_status",type:"categorical"}),"Nutrition rows")}
      ${profileCard("Child Height Status",simpleDistribution(heightStatus,Infinity,{kind:"repeater-field",path:"nutrition_children.height_status",type:"categorical"}),"Nutrition rows")}
      ${profileCard("Immunization Status",simpleDistribution(immunStatus,Infinity,{kind:"repeater-field",path:"immunization_children.status",type:"categorical"}),"Child immunization rows")}
      ${profileCard("PhilHealth Member Types",simpleDistribution(phil,Infinity,{kind:"repeater-field",path:"philhealth_members.type",type:"categorical"}),"Recorded member rows")}
      ${profileCard("Reported Illnesses",simpleDistribution(illnesses,Infinity,{kind:"repeater-field",path:"illnesses.illness",type:"categorical"}),`${illnessRows.length} illness row(s)`)}
      ${profileCard("Illness Records by Age × Illness",illnessByAge(),"All recorded age–illness combinations")}
      ${profileCard("Illness Records by Sex",simpleDistribution(illnessSex,Infinity,{kind:"repeater-field",path:"illnesses.sex",type:"categorical"}),"Rows with sex recorded")}
      ${profileCard("Reported Causes of Death",simpleDistribution(causes,Infinity,{kind:"repeater-field",path:"deaths.cause",type:"categorical"}),`${deathRows.length} death row(s)`)}
    </div>
    <div class="profile-grid three" style="margin-top:7px">${vitalsProfileCards()}</div>
    <div class="profile-note"><strong>Health graphs are descriptive.</strong> Vital-sign charts summarize recorded measurements and do not assign clinical diagnoses.</div>`;
  }

  function communityProfile(){
    const income=topValues("family_income_bracket");
    const livelihood=topValues("livelihood");
    const education=getPopulationProfiles().map(p=>p.education).filter(v=>!blank(v));
    const water=topValues("water_drinking");
    const treatment=topValues("water_treatment");
    const toilet=topValues("with_toilet");
    const toiletType=topValues("toilet_type");
    const garbage=topValues("garbage_disposal");
    const animals=topValues("with_animals");
    const org=topValues("community_org_involvement");
    const projects=topValues("community_projects_participated");

    return `<div class="profile-grid three">
      ${profileCard("Family Income",renderBars(counts(income),answeredCount(income),Infinity,{kind:"field",path:"family_income_bracket",type:"categorical"}),"Household income bracket")}
      ${profileCard("Livelihood",renderBars(counts(livelihood,{multi:true}),livelihood.filter(v=>Array.isArray(v)&&v.length).length,Infinity,{kind:"field",path:"livelihood",type:"multi"}),"Multiple responses allowed")}
      ${profileCard("Educational Attainment",simpleDistribution(education,Infinity,{kind:"population-field",field:"education"}),"Profiled members")}
      ${profileCard("Drinking Water Source",renderBars(counts(water),answeredCount(water),Infinity,{kind:"field",path:"water_drinking",type:"categorical"}),"Households")}
      ${profileCard("Water Treatment",renderBars(counts(treatment),answeredCount(treatment),Infinity,{kind:"field",path:"water_treatment",type:"categorical"}),"Households")}
      ${yesNoMini("Households with Toilet",toilet,{kind:"field",path:"with_toilet",type:"binary"})}
      ${profileCard("Toilet Type",renderBars(counts(toiletType),answeredCount(toiletType),Infinity,{kind:"field",path:"toilet_type",type:"categorical"}),"Answered households")}
      ${profileCard("Garbage Disposal",renderBars(counts(garbage,{multi:true}),garbage.filter(v=>Array.isArray(v)&&v.length).length,Infinity,{kind:"field",path:"garbage_disposal",type:"multi"}),"Multiple responses allowed")}
      ${yesNoMini("Animals in Household",animals,{kind:"field",path:"with_animals",type:"binary"})}
      ${yesNoMini("Organization Involvement",org,{kind:"field",path:"community_org_involvement",type:"binary"})}
      ${profileCard("Community Projects Mentioned",simpleDistribution(projects),"Free-text responses")}
      ${profileCard("Top Community Problems",topCommunityProblems(),"From Problems & Recommendations")}
      ${profileCard("Zone Comparison",zoneComparison(),"Toilet, water treatment, and organization involvement",true)}
    </div>
    <div class="profile-note"><strong>Zone comparison:</strong> percentages use answered responses within each zone, so denominators may differ by indicator.</div>`;
  }

  function renderProfileDashboard(){
    const note=document.getElementById("profile-sample-note");
    if(note)note.textContent=`${filteredRecords.length} household${filteredRecords.length===1?"":"s"}`;
    const target=document.getElementById("profile-dashboard");
    if(!target)return;
    if(!filteredRecords.length){
      target.innerHTML='<div class="profile-empty">No completed surveys match the current filters.</div>';
      return;
    }
    if(activeProfileTab==="population")target.innerHTML=populationProfile();
    else if(activeProfileTab==="health")target.innerHTML=healthProfile();
    else if(activeProfileTab==="community")target.innerHTML=communityProfile();
    else if(activeProfileTab==="audit")target.innerHTML=auditProfile();
    else target.innerHTML=overviewProfile();
    target.insertAdjacentHTML("beforeend",`<div class="data-cleaning-note"><strong>Response cleaning:</strong> equivalent category spellings are grouped for analytics. Population visuals additionally use one canonical deduplicated member list; birthdate-based age is preferred when available. Use the Data Audit tab to verify reconciliation.</div>`);
  }

  function renderOverview(){
    const gps=filteredRecords.filter(r=>r.latitude!=null&&r.longitude!=null).length;
    const barangays=new Set(filteredRecords.map(r=>normalize(r.barangay)).filter(Boolean)).size;
    const interviewers=new Set(filteredRecords.map(r=>normalize(r.interviewer)).filter(Boolean)).size;
    const encoders=new Set(filteredRecords.map(r=>encoderName(r.submitted_by)).filter(Boolean)).size;
    const dates=filteredRecords.map(r=>r.interview_date).filter(Boolean).sort();
    const dateRange=dates.length?(dates.length===1?dates[0]:`${dates[0]} → ${dates[dates.length-1]}`):"—";

    let totalAnswered=0,totalPossible=0;
    const topKeys=collectTopFields();
    filteredRecords.forEach(r=>{
      topKeys.forEach(k=>{
        if(isSensitive(k))return;
        totalPossible++;
        if(!blank(r.response_json?.[k]))totalAnswered++;
      });
    });
    const completeness=totalPossible?Math.round(totalAnswered/totalPossible*100):0;

    const cards=[
      ["Households",filteredRecords.length,"completed surveys"],
      ["GPS coverage",filteredRecords.length?`${pct(gps,filteredRecords.length)}%`:"—",`${gps} mapped`],
      ["Barangays",barangays,"represented"],
      ["Interviewers",interviewers,"in filtered data"],
      ["Encoders",encoders,"group members"],
      ["Completion",`${completeness}%`,"top-level fields"],
      ["Date range",dateRange,"interviews"]
    ];
    document.getElementById("analytics-overview").innerHTML=cards.map(([a,b,c])=>`<article class="kpi-card"><span>${safe(a)}</span><strong>${safe(b)}</strong><small>${safe(c)}</small></article>`).join("");
  }


  function sameCanonical(a,b){
    if(blank(a)||blank(b))return false;
    return canonicalCategory(a).key===canonicalCategory(b).key;
  }

  function valueMatchesTrace(raw,spec){
    if(spec.mode==="answered")return !blank(raw);
    if(spec.mode==="date-month"){
      const d=dateValue(raw);
      if(!d)return false;
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      return key===spec.value;
    }
    if(spec.type==="binary"){
      const n=normalize(raw).toLowerCase();
      const wanted=normalize(spec.value).toLowerCase();
      if(wanted==="yes")return n==="yes"||n==="true";
      if(wanted==="no")return n==="no"||n==="false";
    }
    if(Array.isArray(raw))return raw.some(v=>sameCanonical(v,spec.value));
    return sameCanonical(raw,spec.value);
  }

  function traceMatches(spec){
    const matches=[];
    if(!spec)return matches;


    if(spec.kind==="ranked-field-item"){
      filteredRecords.forEach((record,recordIndex)=>{
        const raw=record.response_json?.[spec.path];
        const items=splitRankedText(raw,spec.parseKind);
        if(items.some(item=>sameCanonical(item,spec.value))){
          matches.push({
            record,recordIndex,
            detail:{field:spec.path,value:raw,parsedItem:spec.value}
          });
        }
      });
      return matches;
    }

    if(spec.kind==="field"){
      filteredRecords.forEach((record,recordIndex)=>{
        const raw=record.response_json?.[spec.path];
        if(valueMatchesTrace(raw,spec))matches.push({record,recordIndex,detail:{field:spec.path,value:raw}});
      });
      return matches;
    }

    if(spec.kind==="repeater-field"){
      const [rep,field]=spec.path.split(".");
      filteredRecords.forEach((record,recordIndex)=>{
        const rows=record.response_json?.[rep];
        if(!Array.isArray(rows))return;
        rows.forEach((row,rowIndex)=>{
          if(row&&typeof row==="object"&&valueMatchesTrace(row[field],spec)){
            matches.push({record,recordIndex,detail:{repeater:rep,field,rowIndex,row,value:row[field]}});
          }
        });
      });
      return matches;
    }

    if(spec.kind==="population-age"||spec.kind==="population-age-sex"||spec.kind==="population-field"||spec.kind==="population-month-range"){
      getPopulationProfiles().forEach(person=>{
        let ok=false;
        if(spec.kind==="population-age")ok=person.age_band===spec.value;
        else if(spec.kind==="population-age-sex")ok=person.age_band===spec.value&&person.sex_group===spec.sex;
        else if(spec.kind==="population-field")ok=sameCanonical(person[spec.field],spec.value);
        else ok=person.age_months!==null&&person.age_months>=spec.min&&person.age_months<=spec.max;
        if(ok){
          const record=filteredRecords[person.recordIndex];
          if(record)matches.push({record,recordIndex:person.recordIndex,detail:{person}});
        }
      });
      return matches;
    }
    return matches;
  }

  function ensureSourceTraceModal(){
    let modal=document.getElementById("source-trace-modal");
    if(modal)return modal;
    modal=document.createElement("div");
    modal.id="source-trace-modal";
    modal.className="source-trace-modal";
    modal.hidden=true;
    modal.innerHTML=`<section class="source-trace-dialog" role="dialog" aria-modal="true" aria-labelledby="source-trace-title">
      <header class="source-trace-head"><div><h2 id="source-trace-title">Source surveys</h2><p id="source-trace-subtitle"></p></div><button type="button" class="source-trace-close" aria-label="Close">×</button></header>
      <div class="source-trace-body" id="source-trace-body"></div>
    </section>`;
    document.body.appendChild(modal);
    modal.querySelector(".source-trace-close").addEventListener("click",()=>{modal.hidden=true;document.body.style.overflow="";});
    modal.addEventListener("click",e=>{if(e.target===modal){modal.hidden=true;document.body.style.overflow="";}});
    return modal;
  }

  function matchDetailText(match){
    const d=match.detail||{};
    if(d.person){
      const p=d.person;
      const bits=[p.name&&`Member: ${p.name}`,p.role&&`Role: ${p.role}`,p.age!==null&&`Age: ${p.age}`,p.sex_group&&`Sex: ${p.sex_group}`].filter(Boolean);
      return bits.join(" · ");
    }
    if(d.row){
      const preferred=["name","member_name","person_name","illness","cause","age","sex","status","type"];
      const bits=[];
      preferred.forEach(k=>{if(!blank(d.row[k]))bits.push(`${humanize(k)}: ${normalize(d.row[k])}`);});
      if(!bits.length)bits.push(`${humanize(d.field||"Match")}: ${normalize(d.value)}`);
      return bits.join(" · ");
    }
    if(d.parsedItem)return `${fieldLabel(d.field)} → ${d.parsedItem} · Raw response: ${Array.isArray(d.value)?d.value.join(" | "):normalize(d.value)}`;
    return d.field?`${fieldLabel(d.field)}: ${Array.isArray(d.value)?d.value.join(" | "):normalize(d.value)}`:"";
  }

  function canEditRecord(record){
    return ctx.member?.role==="admin" || (!!record.submitted_by&&record.submitted_by===ctx.user?.id);
  }

  function sourceLabel(spec){
    if(spec.label)return spec.label;
    if(spec.kind==="population-age")return `Age group: ${spec.value}`;
    if(spec.kind==="population-age-sex")return `${spec.sex}, age ${spec.value}`;
    if(spec.kind==="population-field")return `${humanize(spec.field)}: ${spec.value}`;
    if(spec.kind==="ranked-field-item")return `${fieldLabel(spec.path)}: ${spec.value}`;
    if(spec.path)return `${fieldLabel(spec.path)}${spec.value!==undefined?`: ${spec.value}`:""}`;
    return spec.value||"Selected data";
  }

  function showTraceSources(spec){
    const modal=ensureSourceTraceModal();
    const body=modal.querySelector("#source-trace-body");
    const title=modal.querySelector("#source-trace-title");
    const subtitle=modal.querySelector("#source-trace-subtitle");
    const matches=traceMatches(spec);
    title.textContent="Source surveys";
    subtitle.textContent=`${sourceLabel(spec)} · ${matches.length} matching record${matches.length===1?"":"s"}`;
    if(!matches.length){body.innerHTML='<div class="source-trace-empty">No matching source record was found under the current filters.</div>';}
    else{
      body.innerHTML=`<div class="source-match-list">${matches.map((m,i)=>{
        const r=m.record;
        const hh=r.household_code||r.response_json?.household_number||`Household ${m.recordIndex+1}`;
        const detail=matchDetailText(m);
        return `<article class="source-match">
          <div><h3>${safe(hh)}</h3><div class="source-match-meta"><span>${safe(r.zone||"Zone not stated")}</span><span>${safe(r.interview_date||"No interview date")}</span><span>Interviewer: ${safe(r.interviewer||"Not stated")}</span><span>Encoder: ${safe(encoderName(r.submitted_by))}</span></div>${detail?`<div class="source-match-detail">${safe(detail)}</div>`:""}</div>
          <div class="source-match-actions"><button type="button" class="primary" data-view-source-record="${m.recordIndex}">View survey</button>${canEditRecord(r)?`<button type="button" data-edit-source-record="${m.recordIndex}">Edit survey</button>`:""}</div>
        </article>`;
      }).join("")}</div><div class="source-privacy-note">Source tracing is for internal data validation. Direct identifiers remain excluded from exported aggregate graphs.</div>`;
    }
    modal.hidden=false;
    document.body.style.overflow="hidden";
  }

  function readableValue(value){
    if(blank(value))return "—";
    if(Array.isArray(value)){
      if(value.every(v=>v===null||["string","number","boolean"].includes(typeof v)))return value.filter(v=>v!==null).join(" | ")||"—";
      return `${value.length} row${value.length===1?"":"s"}`;
    }
    if(typeof value==="object")return JSON.stringify(value);
    return String(value);
  }

  function renderReadOnlySurvey(record,recordIndex){
    const modal=ensureSourceTraceModal();
    const body=modal.querySelector("#source-trace-body");
    const title=modal.querySelector("#source-trace-title");
    const subtitle=modal.querySelector("#source-trace-subtitle");
    const j=record.response_json||{};
    const hh=record.household_code||j.household_number||`Household ${recordIndex+1}`;
    title.textContent=hh;
    subtitle.textContent="Read-only source survey";

    const topFields=[];
    const repeaters=[];
    Object.entries(j).forEach(([key,value])=>{
      if(Array.isArray(value)&&value.some(v=>v&&typeof v==="object"&&!Array.isArray(v)))repeaters.push([key,value]);
      else topFields.push([key,value]);
    });

    const topHtml=`<section class="readonly-survey-section"><h3>Household survey responses</h3><div class="readonly-field-grid">${topFields.sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`<div class="readonly-field"><span>${safe(fieldLabel(k))}</span><strong>${safe(readableValue(v))}</strong></div>`).join("")}</div></section>`;
    const repHtml=repeaters.sort((a,b)=>a[0].localeCompare(b[0])).map(([key,rows])=>`<section class="readonly-survey-section"><h3>${safe(humanize(key))}</h3><div class="readonly-repeater">${rows.map((row,i)=>`<div class="readonly-repeater-row"><strong>Row ${i+1}</strong><div class="readonly-field-grid">${Object.entries(row||{}).map(([k,v])=>`<div class="readonly-field"><span>${safe(fieldLabel(`${key}.${k}`))}</span><strong>${safe(readableValue(v))}</strong></div>`).join("")}</div></div>`).join("")}</div></section>`).join("");

    body.innerHTML=`<div class="source-survey-toolbar"><button type="button" data-back-to-trace>← Back to source list</button>${canEditRecord(record)?`<button type="button" data-edit-source-record="${recordIndex}">Edit this survey</button>`:""}</div>
      <div class="source-survey-meta"><div><span>Household</span><strong>${safe(hh)}</strong></div><div><span>Interview date</span><strong>${safe(record.interview_date||"—")}</strong></div><div><span>Zone</span><strong>${safe(record.zone||"—")}</strong></div><div><span>Interviewer</span><strong>${safe(record.interviewer||"—")}</strong></div><div><span>Encoder</span><strong>${safe(encoderName(record.submitted_by))}</strong></div><div><span>Record ID</span><strong>${safe((record.local_uuid||record.id||"—").slice(0,12))}</strong></div></div>${topHtml}${repHtml}`;
  }

  async function editSourceRecord(recordIndex){
    const record=filteredRecords[Number(recordIndex)];
    if(!record||!canEditRecord(record)){alert("You can only edit your own surveys unless you are an admin.");return;}
    if(!record.local_uuid){alert("This cached record does not include a local survey ID. Reconnect and refresh the Diagnosis page first.");return;}
    let local=await ctx.db.getSubmission(record.local_uuid);
    if(!local){
      if(!ctx.online()){alert("Reconnect first so this synced survey can be opened safely for editing.");return;}
      const gps=(record.latitude!==null&&record.latitude!==undefined&&record.longitude!==null&&record.longitude!==undefined)?{latitude:record.latitude,longitude:record.longitude,accuracy:record.gps_accuracy_m??null,altitude:null,captured_at:record.location_captured_at||null,source:"server"}:null;
      local={local_uuid:record.local_uuid,form_code:"SHS-HH-2023",form_version:"2023.1",form_status:record.status||"completed",sync_status:"synced",server_id:record.id,submitted_by:record.submitted_by,user_id:record.submitted_by,community_id:null,community_name:"Alang-Alang",household_number:record.household_code||"",interview_date:record.interview_date||"",barangay:record.barangay||"",zone:record.zone||"",interviewer:record.interviewer||"",responses:record.response_json||{},gps,has_location:!!gps,has_photo:!!record.photo_path,photo_path:record.photo_path||null,created_at:record.created_at||new Date().toISOString(),updated_at:record.updated_at||new Date().toISOString(),synced_at:record.updated_at||new Date().toISOString(),last_error:null};
      await ctx.db.putSubmission(local);
    }
    location.href=`household-survey.html?local_id=${encodeURIComponent(record.local_uuid)}`;
  }

  let lastTraceSpec=null;
  document.addEventListener("click",e=>{
    if(e.target.closest("#download-compressed-health-csv")){exportCompressedHealthTally();return;}
    const trace=e.target.closest("[data-trace]");
    if(trace&&!trace.closest("#source-trace-modal")){
      try{lastTraceSpec=JSON.parse(decodeURIComponent(trace.dataset.trace));showTraceSources(lastTraceSpec);}catch(err){console.error(err);}
      return;
    }
    const view=e.target.closest("[data-view-source-record]");
    if(view){const idx=Number(view.dataset.viewSourceRecord);const record=filteredRecords[idx];if(record)renderReadOnlySurvey(record,idx);return;}
    const edit=e.target.closest("[data-edit-source-record]");
    if(edit){editSourceRecord(edit.dataset.editSourceRecord);return;}
    if(e.target.closest("[data-back-to-trace]")&&lastTraceSpec){showTraceSources(lastTraceSpec);}
  });
  document.addEventListener("keydown",e=>{
    if((e.key==="Enter"||e.key===" ")&&e.target.matches?.("[data-trace]")){e.preventDefault();e.target.click();}
    if(e.key==="Escape"){const modal=document.getElementById("source-trace-modal");if(modal&&!modal.hidden){modal.hidden=true;document.body.style.overflow="";}}
  });

  function renderAll(){
    renderOverview();
    renderProfileDashboard();
    renderCompleteness();
    renderSections();
    attachDownloadButtons(document);
  }

  function applyQuestionSearch(){
    const q=normalize(document.getElementById("question-search").value).toLowerCase();
    document.querySelectorAll(".question-card[data-question]").forEach(card=>{
      card.dataset.hidden=q && !card.dataset.question.includes(q) ? "true":"false";
    });
  }

  function csvEscape(v){
    const s=String(v??"").replace(/\r?\n/g," ");
    return `"${s.replaceAll('"','""')}"`;
  }

  function exportSummary(){
    const rows=[
      ["Field","Question","Type","Scope","Value / Statistic","Count / Value","Denominator","Percent"],
      ...csvRows
    ];
    const csv="\uFEFF"+rows.map(r=>r.map(csvEscape).join(",")).join("\r\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`alang-alang-all-question-analytics-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function notes(){
    let data=[];
    if(ctx.online()&&ctx.client){
      const r=await ctx.client.from("aa_diagnosis_notes").select("*");
      data=r.data||[];
      await ctx.db.setSetting("cached_diagnosis_notes",data);
    }else data=await ctx.db.getSetting("cached_diagnosis_notes")||[];
    data.forEach(n=>{
      const el=document.querySelector(`[data-note="${CSS.escape(n.note_type)}"]`);
      if(el)el.value=n.note_text||"";
    });
    document.querySelectorAll("[data-note]").forEach(el=>{
      let timer;
      el.addEventListener("input",()=>{
        clearTimeout(timer);
        timer=setTimeout(()=>saveNote(el),700);
      });
    });
  }

  async function saveNote(el){
    if(!ctx.online()||!ctx.client){
      document.getElementById("notes-status").textContent="Offline";
      return;
    }
    const {error}=await ctx.client.from("aa_diagnosis_notes").upsert({
      note_type:el.dataset.note,
      note_text:el.value,
      updated_by:ctx.user.id,
      updated_at:new Date().toISOString()
    },{onConflict:"note_type"});
    document.getElementById("notes-status").textContent=error?"Save error":"Saved ✓";
  }

  async function priorities(){
    let rows=[];
    if(ctx.online()&&ctx.client){
      const r=await ctx.client.from("aa_diagnosis_priorities").select("*").order("score",{ascending:false}).order("created_at");
      rows=r.data||[];
      await ctx.db.setSetting("cached_priorities",rows);
    }else rows=await ctx.db.getSetting("cached_priorities")||[];
    renderPriorities(rows);
  }

  function renderPriorities(rows){
    const t=document.getElementById("priority-list");
    if(!rows.length){
      t.innerHTML='<div class="empty">No priority problems yet.</div>';
      return;
    }
    t.innerHTML=rows.map(r=>`<article class="priority-card">
      <div>
        <span class="pill">Score ${r.score??0}/20</span>
        <strong>${safe(r.problem)}</strong>
        <p>${safe(r.evidence||"No evidence note yet.")}</p>
        <small>${safe(r.status||"proposed")}</small>
      </div>
      <div class="score-grid">
        <span>Magnitude <b>${r.magnitude}</b></span>
        <span>Seriousness <b>${r.seriousness}</b></span>
        <span>Feasibility <b>${r.feasibility}</b></span>
        <span>Community concern <b>${r.community_concern}</b></span>
      </div>
    </article>`).join("");
  }

  document.getElementById("add-priority").addEventListener("click",async()=>{
    if(!ctx.online()||!ctx.client){alert("Connect to add a shared priority.");return;}
    const problem=prompt("Priority problem:");
    if(!problem)return;
    const evidence=prompt("Brief evidence / rationale:")||"";
    const ask=x=>Math.max(1,Math.min(5,Number(prompt(`${x} score (1–5):`,"3"))||3));
    const magnitude=ask("Magnitude"),seriousness=ask("Seriousness"),feasibility=ask("Feasibility"),community_concern=ask("Community concern");
    const {error}=await ctx.client.from("aa_diagnosis_priorities").insert({
      problem,evidence,magnitude,seriousness,feasibility,community_concern,
      created_by:ctx.user.id,updated_by:ctx.user.id
    });
    if(error)alert(error.message);else priorities();
  });

  document.querySelectorAll("[data-profile-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      activeProfileTab=btn.dataset.profileTab||"overview";
      document.querySelectorAll("[data-profile-tab]").forEach(x=>x.classList.toggle("active",x===btn));
      renderProfileDashboard();
      attachDownloadButtons(document.getElementById("profile-dashboard"));
    });
  });

  document.getElementById("download-profile-svg")?.addEventListener("click",async()=>{
    const btn=document.getElementById("download-profile-svg");
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent="Saving…";
    try{
      await downloadGraphImage(document.getElementById("profile-dashboard"),`alang-alang-community-profile-${activeProfileTab}`);
    }catch(err){
      console.error(err);
      alert("Could not export the Community Profile in this browser.");
    }finally{
      btn.disabled=false;
      btn.textContent=old;
    }
  });

  ["filter-barangay","filter-zone","filter-interviewer","filter-encoder","filter-from","filter-to"]
    .forEach(id=>document.getElementById(id).addEventListener("change",applyFilters));

  document.getElementById("reset-filters").addEventListener("click",()=>{
    ["filter-barangay","filter-zone","filter-interviewer","filter-encoder","filter-from","filter-to"].forEach(id=>document.getElementById(id).value="");
    applyFilters();
  });

  document.getElementById("question-search").addEventListener("input",applyQuestionSearch);
  document.getElementById("expand-all").addEventListener("click",()=>document.querySelectorAll(".analytics-section").forEach(x=>x.open=true));
  document.getElementById("collapse-all").addEventListener("click",()=>document.querySelectorAll(".analytics-section").forEach(x=>x.open=false));
  document.getElementById("export-summary").addEventListener("click",exportSummary);
  document.getElementById("print-analytics").addEventListener("click",()=>window.print());

  await loadMemberNames();
  await loadRecords();
  setupFilters();
  applyFilters();
  await notes();
  await priorities();
}).catch(err=>{
  console.error(err);
  const t=document.getElementById("questionnaire-analytics");
  if(t)t.innerHTML=`<div class="panel"><div class="empty">${String(err.message||err)}</div></div>`;
});
