(() => {
  const DB_NAME = "alang-alang-fieldwork";
  const DB_VERSION = 1;
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("submissions")){const s=db.createObjectStore("submissions",{keyPath:"local_uuid"});s.createIndex("sync_status","sync_status");s.createIndex("updated_at","updated_at");}if(!db.objectStoreNames.contains("media"))db.createObjectStore("media",{keyPath:"local_media_id"});if(!db.objectStoreNames.contains("settings"))db.createObjectStore("settings",{keyPath:"key"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function reqP(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function putSubmission(r){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction("submissions","readwrite");tx.objectStore("submissions").put(r);tx.oncomplete=()=>resolve(r);tx.onerror=()=>reject(tx.error);});}
  async function getSubmission(id){const db=await openDB();return reqP(db.transaction("submissions","readonly").objectStore("submissions").get(id));}
  async function getAllSubmissions(){const db=await openDB();const rows=await reqP(db.transaction("submissions","readonly").objectStore("submissions").getAll());return (rows||[]).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));}
  async function putMedia(r){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction("media","readwrite");tx.objectStore("media").put(r);tx.oncomplete=()=>resolve(r);tx.onerror=()=>reject(tx.error);});}
  async function getMedia(id){const db=await openDB();return reqP(db.transaction("media","readonly").objectStore("media").get(id));}
  async function deleteMedia(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction("media","readwrite");tx.objectStore("media").delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function setSetting(key,value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction("settings","readwrite");tx.objectStore("settings").put({key,value,updated_at:new Date().toISOString()});tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);});}
  async function getSetting(key){const db=await openDB();const row=await reqP(db.transaction("settings","readonly").objectStore("settings").get(key));return row?.value??null;}
  window.AAOfflineDB={openDB,putSubmission,getSubmission,getAllSubmissions,putMedia,getMedia,deleteMedia,setSetting,getSetting};
})();