const params=new URLSearchParams(location.search);
const missionControl=params.get('family')==='mission-control';
const themes=await fetch(missionControl?'./mission-control/themes.json':'./themes.json').then(r=>r.json());
const theme=themes.find(t=>t.id===new URLSearchParams(location.search).get('design'))??themes[0];
const root=document.documentElement;
for(const key of ['bg','surface','border','text','muted','accent','secondary'])root.style.setProperty(`--${key}`,theme[key]);
root.style.setProperty('--font',`"${theme.font}",system-ui,sans-serif`);
root.style.setProperty('--display',`"${theme.display}",system-ui,sans-serif`);
root.style.setProperty('--radius',`${theme.radius}px`);
document.body.dataset.style=theme.style;
document.body.dataset.variant=theme.variant??'';
document.body.dataset.composition=theme.composition??'';
document.getElementById('study-id').textContent=theme.id;
document.getElementById('study-name').textContent=theme.name;
document.getElementById('study-palette').textContent=theme.palette+' / '+theme.font;
document.title=`${theme.id} · ${theme.name} · PULSE Overview`;

// Optional typography comparison on the same complete, static Overview.
const typeface=params.get('typeface');
if(typeface){
  const recipes=await fetch('./typography/recipes.json').then(r=>r.json());
  const recipe=recipes.find(t=>t.id===typeface);
  if(recipe){
    root.dataset.overviewTypeface=recipe.id;
    for(const [token,value] of [['font',recipe.ui],['display',recipe.heading],['number',recipe.number],['label',recipe.id==='T01'?'IBM Plex Mono':recipe.ui]])root.style.setProperty('--'+token,`"${value}", system-ui, sans-serif`);
    document.getElementById('study-id').textContent=recipe.id;
    document.getElementById('study-name').textContent=theme.name;
    document.getElementById('study-palette').textContent=recipe.fonts;
    document.title=`${recipe.id} · ${theme.name} · ${recipe.fonts} · Overview`;
    const controls=document.createElement('div');controls.className='type-body-controls';
    controls.innerHTML='<span class="selected">Front</span><span>Back</span>';
    document.querySelector('.model').append(controls);
  }
}
