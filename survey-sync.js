(() => {
  async function syncRecord(ctx,record){
    if(!ctx.online()||!ctx.client)return false;
    const {data:sess}=await ctx.client.auth.getSession();const u=sess?.session?.user;if(!u)throw new Error('Session expired. Sign in again before syncing.');
    const payload={local_uuid:record.local_uuid,submitted_by:u.id,status:record.form_status==='completed'?'completed':'draft',household_code:record.household_number||null,interview_date:record.interview_date||null,barangay:record.barangay||null,zone:record.zone||null,interviewer:record.interviewer||null,response_json:record.responses||{},latitude:record.gps?.latitude??null,longitude:record.gps?.longitude??null,gps_accuracy_m:record.gps?.accuracy??null,location_captured_at:record.gps?.captured_at??null,updated_at:new Date().toISOString()};
    const {data:row,error}=await ctx.client.from('aa_household_submissions').upsert(payload,{onConflict:'local_uuid'}).select('id,photo_path').single();if(error)throw error;
    let photoPath=row.photo_path||null;const media=await ctx.db.getMedia(`${record.local_uuid}:household_photo`);
    if(media?.blob){const ext=(media.file_name||'photo.jpg').split('.').pop().replace(/[^a-zA-Z0-9]/g,'')||'jpg';const path=`${u.id}/${row.id}/household-reference.${ext}`;const body=await media.blob.arrayBuffer();const {error:upErr}=await ctx.client.storage.from('aa-field-media').upload(path,body,{contentType:media.content_type||'image/jpeg',upsert:true});if(upErr)throw upErr;photoPath=path;const {error:e2}=await ctx.client.from('aa_household_submissions').update({photo_path:path,updated_at:new Date().toISOString()}).eq('id',row.id);if(e2)throw e2;}
    const synced={...record,user_id:u.id,server_id:row.id,photo_path:photoPath,sync_status:'synced',synced_at:new Date().toISOString(),updated_at:new Date().toISOString(),last_error:null};await ctx.db.putSubmission(synced);return synced;
  }
  async function syncAll(ctx){const rows=(await ctx.db.getAllSubmissions()).filter(r=>r.sync_status!=='synced');let ok=0,errors=0;for(const row of rows){try{await syncRecord(ctx,row);ok++;}catch(err){errors++;await ctx.db.putSubmission({...row,sync_status:'error',last_error:err.message||String(err),updated_at:new Date().toISOString()});console.error(err);}}return{ok,errors};}
  window.AASurveySync={syncRecord,syncAll};
})();