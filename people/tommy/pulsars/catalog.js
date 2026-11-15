// Shared by the server and browser. Prices and allowed appearance values are server-owned.
export const DEFAULT_LOOK=Object.freeze({body:'body-cyan',ring:'ring-amber',expression:'face-happy',accessory:'gear-none'});
export const CATALOG=Object.freeze([
 {id:'body-cyan',slot:'body',name:'Pulse blue',price:0,color:'#27eaff',light:'#e3ffff',shade:'#0b779e'},
 {id:'body-mint',slot:'body',name:'Sea glass',price:800,color:'#77e6b6',light:'#eaffed',shade:'#287e75'},
 {id:'body-rose',slot:'body',name:'Rose nebula',price:800,color:'#fa9ebe',light:'#fff0f5',shade:'#a44680'},
 {id:'body-lilac',slot:'body',name:'Lilac haze',price:800,color:'#b3a1ff',light:'#f4efff',shade:'#6248ab'},
 {id:'body-amber',slot:'body',name:'Solar honey',price:800,color:'#f0c56b',light:'#fff3c4',shade:'#b47127'},
 {id:'body-pearl',slot:'body',name:'Moon pearl',price:1800,color:'#d9e9ef',light:'#ffffff',shade:'#8a9bb8',premium:true},
 {id:'body-aurora',slot:'body',name:'Aurora',price:2400,color:'#8ef5d5',light:'#f6ccff',shade:'#7074d5',premium:true},
 {id:'ring-amber',slot:'ring',name:'Original orbit',price:0,color:'#f0c56b'},
 {id:'ring-ice',slot:'ring',name:'Glacier orbit',price:500,color:'#a0edff'},
 {id:'ring-rose',slot:'ring',name:'Rose orbit',price:500,color:'#ffafd1'},
 {id:'ring-lilac',slot:'ring',name:'Violet orbit',price:500,color:'#c6b1ff'},
 {id:'ring-solar',slot:'ring',name:'Solar flare',price:1500,color:'#ffe8a0',premium:true},
 {id:'face-happy',slot:'expression',name:'Happy to be here',price:0,face:'happy'},
 {id:'face-grumpy',slot:'expression',name:'Tiny grump',price:900,face:'grumpy'},
 {id:'face-curious',slot:'expression',name:'Curious little orbit',price:900,face:'curious'},
 {id:'face-sleepy',slot:'expression',name:'Dream mode',price:900,face:'sleepy'},
 {id:'face-love',slot:'expression',name:'Starry-eyed',price:1400,face:'love',premium:true},
 {id:'gear-none',slot:'accessory',name:'Simply you',price:0,gear:'none'},
 {id:'gear-glasses',slot:'accessory',name:'Round spectacles',price:1000,gear:'glasses'},
 {id:'gear-shades',slot:'accessory',name:'Cruise shades',price:1000,gear:'shades'},
 {id:'gear-cap',slot:'accessory',name:'Mission cap',price:1000,gear:'cap'},
 {id:'gear-beanie',slot:'accessory',name:'Cosmic beanie',price:1200,gear:'beanie'},
 {id:'gear-fur',slot:'accessory',name:'Cloud fluff',price:2200,gear:'fur',premium:true},
 {id:'gear-crown',slot:'accessory',name:'Starlight crown',price:3000,gear:'crown',premium:true},
].map(Object.freeze));
export const ITEM_BY_ID=Object.freeze(Object.fromEntries(CATALOG.map(item=>[item.id,item])));
export const ANSWER_IDS=Object.freeze(['mood','stress','fatigue','worry','focus','motivation','loneliness','connection','workload','mentalRest']);
