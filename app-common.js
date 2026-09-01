(() => {
  const cfg=window.APP_CONFIG||{}; const db=window.AAOfflineDB;
  let client=null,ctx=null;
  const safe=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const online=()=>navigator.onLine;
  function configReady(){return cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("YOUR-")&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");}
  function setNetwork(){document.querySelectorAll('[data-network-chip]').forEach(el=>{el.textContent=online()?"Online":"Offline";el.classList.toggle('offline',!online());});}
  async function context({allowOffline=true}={}){
    if(ctx)return ctx;
    await db.openDB(); setNetwork();
    window.addEventListener('online',setNetwork);window.addEventListener('offline',setNetwork);
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js?v=1').catch(console.warn);
    if(configReady()&&window.supabase?.createClient){client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);}
    let user=null,member=null;
    if(client){const {data}=await client.auth.getSession();user=data?.session?.user||null;}
    if(user&&online()){
      const {data,error}=await client.from('aa_group_members').select('user_id,display_name,role,is_active').eq('user_id',user.id).maybeSingle();
      if(!error&&data){member=data;await db.setSetting('cached_member',data);}
    }
    if(!member&&allowOffline)member=await db.getSetting('cached_member');
    if(!member||member.is_active===false){if(online())location.replace('index.html');throw new Error('This device does not have an active Alang-Alang group session cached yet.');}
    if(!user&&online()){location.replace('index.html');throw new Error('Please sign in.');}
    ctx={client,user,member,db,online,safe,community:'Alang-Alang, Leyte',signOut:async()=>{if(client)await client.auth.signOut();await db.setSetting('cached_member',null);location.replace('index.html');}};
    document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent=member.display_name||user?.email||'Group member');
    document.querySelectorAll('[data-signout]').forEach(btn=>btn.addEventListener('click',ctx.signOut));
    const loading=document.getElementById('app-loading'),shell=document.getElementById('app-shell');if(loading)loading.hidden=true;if(shell)shell.hidden=false;
    return ctx;
  }
  window.AAApp={context,safe,online};
})();