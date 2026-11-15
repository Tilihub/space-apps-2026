// Anatomical left/right belongs to the person, not the viewer. UI locations map to existing areas.
const points=[];
const one=(id,label,area,view,x,y)=>points.push({id,label,area,view,x,y});
const pair=(id,label,area,view,x,y)=>{one(`${view}-left-${id}`,`Left ${label}`,area,view,x,y);one(`${view}-right-${id}`,`Right ${label}`,area,view,-x,y);};
one('front-head','Head','head','front',0,.97);
one('front-neck','Neck','neck','front',0,.855);
for(const view of ['front','back']) {
 if(view==='back'){one('back-head','Back of head','head',view,0,.97);one('back-neck','Back of neck','neck',view,0,.855);}
 pair('shoulder','shoulder','arms',view,.13,.80);
 pair('upper-arm','upper arm','arms',view,.17,.69);
 pair('elbow','elbow','arms',view,.20,.60);
 pair('hand','hand','arms',view,.245,.445);
 if(view==='front'){
  pair('chest','chest','chest',view,.055,.735);
  one('front-upper-abdomen','Upper abdomen','stomach',view,0,.63);
  one('front-lower-abdomen','Lower abdomen','stomach',view,0,.55);
 }else{
  pair('upper-back','upper back','back',view,.055,.74);
  pair('lower-back','lower back','back',view,.045,.59);
  one('back-middle-spine','Middle back','back',view,0,.665);
  one('back-lower-spine','Lower spine','back',view,0,.515);
 }
 pair('hip','hip',view==='front'?'stomach':'back',view,.075,.49);
 pair('thigh','thigh','legs',view,.07,.385);
 pair('knee','knee','legs',view,.067,.275);
 pair('calf',view==='front'?'lower leg':'calf','legs',view,.06,.17);
 pair('foot','foot','legs',view,.055,.035);
}
export const BODY_POINTS=Object.freeze(points.map(Object.freeze));
export const POINT_BY_ID=Object.freeze(Object.fromEntries(BODY_POINTS.map(p=>[p.id,p])));
export const DEFAULT_POINT=Object.freeze({head:'front-head',eyes:'front-head',neck:'front-neck',chest:'front-left-chest',arms:'front-left-upper-arm',stomach:'front-upper-abdomen',back:'back-left-upper-back',legs:'front-left-thigh'});
