// Presentation-only font recipes. Shared by the app shell, body frame and review board.
(() => {
  const presets={
    T01:{ui:'IBM Plex Sans',heading:'IBM Plex Sans',number:'IBM Plex Mono',label:'IBM Plex Mono'},
    T02:{ui:'Inter',heading:'Inter',number:'Inter',label:'Inter'},
    T03:{ui:'Manrope',heading:'Manrope',number:'Manrope',label:'Manrope'},
    T04:{ui:'DM Sans',heading:'DM Sans',number:'DM Sans',label:'DM Sans'},
    T05:{ui:'DM Sans',heading:'Space Grotesk',number:'Space Grotesk',label:'DM Sans'},
    T06:{ui:'Outfit',heading:'Outfit',number:'Outfit',label:'Outfit'},
    T07:{ui:'Archivo',heading:'Archivo',number:'IBM Plex Mono',label:'Archivo'},
    T08:{ui:'IBM Plex Sans',heading:'Barlow Condensed',number:'Barlow Condensed',label:'IBM Plex Sans'}
  };
  const requested=new URLSearchParams(location.search).get('typeface');
  const id=Object.hasOwn(presets,requested)?requested:'T01';
  const recipe=presets[id],root=document.documentElement;
  root.dataset.typeface=id;
  for(const [token,key] of [['font-ui','ui'],['font-display','heading'],['font-number','number'],['font-label','label']])root.style.setProperty('--'+token,`"${recipe[key]}", system-ui, sans-serif`);
})();
