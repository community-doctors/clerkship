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
        .select("id,submitted_by,status,household_code,interview_date,barangay,zone,interviewer,response_json,latitude,longitude,created_at,updated_at")
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

  function counts(vals,{multi=false}={}){
    const m=new Map();
    vals.forEach(raw=>{
      const items=multi?(Array.isArray(raw)?raw:[raw]):[raw];
      items.forEach(v=>{
        if(blank(v))return;
        const label=normalize(v);
        const key=label.toLowerCase();
        if(!m.has(key))m.set(key,{label,count:0});
        m.get(key).count++;
      });
    });
    return [...m.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  }

  function answeredCount(vals){return vals.filter(v=>!blank(v)).length}

  function renderBars(items,denom,limit=10){
    if(!items.length)return '<div class="no-data-box">No answered data.</div>';
    const shown=items.slice(0,limit);
    const max=Math.max(...shown.map(x=>x.count),1);
    return `<div class="bar-chart">${shown.map(x=>{
      const percent=denom?pct(x.count,denom):0;
      const width=Math.max(3,Math.round(x.count/max*100));
      return `<div class="bar-row"><span class="bar-label">${safe(x.label)}</span><span class="bar-track"><i style="width:${width}%"></i></span><span class="bar-value">${x.count}${denom?` · ${percent}%`:""}</span></div>`;
    }).join("")}</div>${items.length>limit?`<div class="more-note">Top ${limit} of ${items.length} responses</div>`:""}`;
  }

  function binaryChart(vals){
    const answered=vals.filter(v=>!blank(v));
    const yes=answered.filter(v=>/^(yes|true)$/i.test(normalize(v))).length;
    const no=answered.filter(v=>/^(no|false)$/i.test(normalize(v))).length;
    const denom=yes+no;
    const p=denom?pct(yes,denom):0;
    return `<div class="binary-chart">
      <div class="donut" style="--donut-angle:${Math.round(p*3.6)}deg"><strong>${p}%</strong></div>
      <div class="donut-legend">
        <div><span>Yes</span><b>${yes}</b></div>
        <div><span>No</span><b>${no}</b></div>
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

  function dateChart(vals){
    const ds=vals.map(dateValue).filter(Boolean);
    const m=new Map();
    ds.forEach(d=>{
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      m.set(key,(m.get(key)||0)+1);
    });
    const items=[...m].sort((a,b)=>a[0].localeCompare(b[0])).map(([label,count])=>({label,count}));
    return renderBars(items,ds.length,12);
  }

  function identifierChart(vals){
    const n=answeredCount(vals);
    return `<div class="identifier-box"><strong>Identifier hidden</strong>${n} of ${filteredRecords.length} records contain this field. Values are not displayed in aggregate analytics.</div>`;
  }

  function textChart(vals){
    const answered=vals.filter(v=>!blank(v));
    const itemCounts=counts(answered);
    const unique=itemCounts.length;
    const chart=renderBars(itemCounts,answered.length,8);
    return `${chart}<div class="text-note">${unique} unique response${unique===1?"":"s"} among ${answered.length} answered.</div>`;
  }

  function multiChart(vals){
    const answered=vals.filter(v=>Array.isArray(v)&&v.length);
    const items=counts(answered,{multi:true});
    return renderBars(items,answered.length,12);
  }

  function chartFor(vals,key,type){
    if(type==="identifier")return identifierChart(vals);
    if(type==="binary")return binaryChart(vals);
    if(type==="numeric")return numericChart(vals);
    if(type==="date")return dateChart(vals);
    if(type==="multi")return multiChart(vals);
    if(type==="text")return textChart(vals);
    if(type==="categorical")return renderBars(counts(vals),answeredCount(vals),12);
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
      <div class="question-card-head"><h3>${safe(label)}</h3><span class="field-code">${safe(path)}</span></div>
      <div class="question-sub">
        <span>${safe(type)}</span>
        <span>${answered} answered</span>
        ${scope!=="household"?`<span>${safe(scope)}</span>`:""}
      </div>
      ${chartFor(vals,key,type)}
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


  const PROFILE_AGE_BANDS=["<1","1–4","5–9","10–14","15–19","20–39","40–59","60+"];
  function profileAgeBand(age){
    if(age===null||age===undefined||Number.isNaN(age))return "Unknown";
    if(age<1)return "<1";
    if(age<=4)return "1–4";
    if(age<=9)return "5–9";
    if(age<=14)return "10–14";
    if(age<=19)return "15–19";
    if(age<=39)return "20–39";
    if(age<=59)return "40–59";
    return "60+";
  }

  function getPopulationProfiles(){
    const people=[];
    filteredRecords.forEach((r,recordIndex)=>{
      const j=r.response_json||{};
      const hh=r.household_code||j.household_number||`Household ${recordIndex+1}`;
      const headName=normalize(j.head_name);
      const headAge=numericValue(j.head_age);
      if(headName||headAge!==null||!blank(j.head_sex)){
        people.push({
          household:hh,
          recordIndex,
          role:"Household Head",
          name:headName,
          age:headAge,
          sex:normalize(j.head_sex),
          civil_status:normalize(j.head_civil_status),
          education:normalize(j.head_education),
          occupation:normalize(j.head_occupation),
          employment:normalize(j.head_employment_status),
          pregnancy_status:normalize(j.head_pregnancy_status)
        });
      }
      const members=Array.isArray(j.family_members)?j.family_members:[];
      members.forEach(m=>{
        const age=numericValue(m.age);
        if(blank(m.name)&&age===null&&blank(m.sex))return;
        people.push({
          household:hh,
          recordIndex,
          role:normalize(m.relation)||"Household Member",
          name:normalize(m.name),
          age,
          sex:normalize(m.sex),
          civil_status:normalize(m.civil_status),
          education:normalize(m.education),
          occupation:normalize(m.occupation),
          employment:"",
          pregnancy_status:normalize(m.pregnancy_status)
        });
      });
    });
    return people;
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
    people.forEach(p=>{
      const band=profileAgeBand(p.age);
      if(!PROFILE_AGE_BANDS.includes(band))return;
      if(/^male$/i.test(p.sex))male[band]++;
      if(/^female$/i.test(p.sex))female[band]++;
    });
    const max=Math.max(1,...PROFILE_AGE_BANDS.flatMap(b=>[male[b],female[b]]));
    const rows=[...PROFILE_AGE_BANDS].reverse().map(b=>{
      const mw=Math.round(male[b]/max*100),fw=Math.round(female[b]/max*100);
      return `<div class="pyramid-row">
        <span class="pyramid-side male"><i style="width:${mw}%">${male[b]||""}</i></span>
        <span class="age-band">${b}</span>
        <span class="pyramid-side female"><i style="width:${fw}%">${female[b]||""}</i></span>
      </div>`;
    }).join("");
    return `<div class="population-pyramid">
      <div class="pyramid-header"><span>Male</span><span>Age</span><span>Female</span></div>
      ${rows}
      <div class="pyramid-footer"><span><b>${Object.values(male).reduce((a,b)=>a+b,0)}</b> male</span><span><b>${Object.values(female).reduce((a,b)=>a+b,0)}</b> female</span></div>
    </div>`;
  }

  function simpleDistribution(values,limit=10){
    const vals=values.filter(v=>!blank(v));
    return renderBars(counts(vals),vals.length,limit);
  }

  function matrixChart(people,rowFn,colField,rowOrder=null,colLimit=7){
    const rows=rowOrder||[...new Set(people.map(rowFn).filter(Boolean))];
    const colCounts=counts(people.map(p=>p[colField]).filter(v=>!blank(v)));
    const cols=colCounts.slice(0,colLimit).map(x=>x.label);
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

  function yesNoMini(title,vals){
    return profileCard(title,binaryChart(vals),`${answeredCount(vals)} answered`);
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
    return simpleDistribution(bands,10);
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
    return simpleDistribution(vals,10);
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
      ${profileKpi("Age 60+",older,"profiled older adults")}
      ${profileKpi("Pregnant",pregnant,"marked currently pregnant")}
      ${profileKpi("Dependency ratio",dep.ratio===null?"—":`${dep.ratio}`,"dependents per 100 ages 15–64")}
    </div>`;

    const ageDist=people.map(p=>profileAgeBand(p.age)).filter(x=>x!=="Unknown");
    const income=topValues("family_income_bracket");
    const illness=repeaterRows("illnesses").map(r=>r.illness).filter(v=>!blank(v));

    return `${kpis}<div class="profile-grid">
      ${profileCard("Population Pyramid",populationPyramid(people),"Age × sex",true)}
      ${profileCard("Age Structure",simpleDistribution(ageDist),"Profiled household members")}
      ${profileCard("Household Size",householdSizeDistribution(people),"Based on listed household profiles")}
      ${profileCard("Family Income",renderBars(counts(income),answeredCount(income),10),"Household distribution")}
      ${profileCard("Top Reported Illnesses",simpleDistribution(illness,8),"From illness records")}
    </div>
    <div class="profile-note"><strong>Derived view:</strong> population totals depend on household head + family members entered in the survey. Missing member profiles are not imputed.</div>`;
  }

  function populationProfile(){
    const people=getPopulationProfiles();
    const sex=people.map(p=>p.sex).filter(v=>!blank(v));
    const age=people.map(p=>profileAgeBand(p.age)).filter(x=>x!=="Unknown");
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
      ${profileCard("Age Group Distribution",simpleDistribution(age),"All profiled members")}
      ${profileCard("Sex Distribution",simpleDistribution(sex),"All profiled members")}
      ${profileCard("Civil Status × Age Group",matrixChart(civil,p=>profileAgeBand(p.age),"civil_status",PROFILE_AGE_BANDS),"Counts among members with both age and civil status",true)}
      ${profileCard("Education × Age Group",matrixChart(edu,p=>profileAgeBand(p.age),"education",PROFILE_AGE_BANDS),"Top educational attainment categories",true)}
      ${profileCard("Common Occupations",simpleDistribution(occupation,10),"Household head + member occupations")}
    </div>`;
  }

  function healthProfile(){
    const people=getPopulationProfiles();
    const pregnant=people.filter(p=>/^currently pregnant$/i.test(p.pregnancy_status)).length;
    const under5=people.filter(p=>p.age!==null&&p.age<5).length;
    const under2=people.filter(p=>p.age!==null&&p.age<2).length;
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
      ${profileKpi("Children <2",under2,"profiled members")}
      ${profileKpi("Pregnant",pregnant,"marked currently pregnant")}
      ${profileKpi("Illness records",illnessRows.length,"survey rows")}
      ${profileKpi("Death records",deathRows.length,"survey rows")}
    </div>`;

    return `${kpis}<div class="profile-grid three">
      ${yesNoMini("Exclusive Breastfeeding 6 Months",bf)}
      ${yesNoMini("Supplementary Feeding",supp)}
      ${profileCard("Child Weight Status",simpleDistribution(weightStatus),"Nutrition rows")}
      ${profileCard("Child Height Status",simpleDistribution(heightStatus),"Nutrition rows")}
      ${profileCard("Immunization Status",simpleDistribution(immunStatus),"Child immunization rows")}
      ${profileCard("PhilHealth Member Types",simpleDistribution(phil),"Recorded member rows")}
      ${profileCard("Top Reported Illnesses",simpleDistribution(illnesses,10),`${illnessRows.length} illness row(s)`)}
      ${profileCard("Illness Records by Age × Illness",illnessByAge(),"Top combinations")}
      ${profileCard("Illness Records by Sex",simpleDistribution(illnessSex),"Rows with sex recorded")}
      ${profileCard("Reported Causes of Death",simpleDistribution(causes,8),`${deathRows.length} death row(s)`)}
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
      ${profileCard("Family Income",renderBars(counts(income),answeredCount(income),10),"Household income bracket")}
      ${profileCard("Livelihood",renderBars(counts(livelihood,{multi:true}),livelihood.filter(v=>Array.isArray(v)&&v.length).length,10),"Multiple responses allowed")}
      ${profileCard("Educational Attainment",simpleDistribution(education,10),"Profiled members")}
      ${profileCard("Drinking Water Source",renderBars(counts(water),answeredCount(water),10),"Households")}
      ${profileCard("Water Treatment",renderBars(counts(treatment),answeredCount(treatment),10),"Households")}
      ${yesNoMini("Households with Toilet",toilet)}
      ${profileCard("Toilet Type",renderBars(counts(toiletType),answeredCount(toiletType),10),"Answered households")}
      ${profileCard("Garbage Disposal",renderBars(counts(garbage,{multi:true}),garbage.filter(v=>Array.isArray(v)&&v.length).length,10),"Multiple responses allowed")}
      ${yesNoMini("Animals in Household",animals)}
      ${yesNoMini("Organization Involvement",org)}
      ${profileCard("Community Projects Mentioned",simpleDistribution(projects,8),"Free-text responses")}
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
    else target.innerHTML=overviewProfile();
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

  function renderAll(){
    renderOverview();
    renderProfileDashboard();
    renderCompleteness();
    renderSections();
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
    });
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
