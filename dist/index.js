'use strict';var Q=require('express'),X=require('dotenv'),path=require('path'),zod=require('zod'),redis=require('redis'),P=require('axios');function _interopDefault(e){return e&&e.__esModule?e:{default:e}}function _interopNamespace(e){if(e&&e.__esModule)return e;var n=Object.create(null);if(e){Object.keys(e).forEach(function(k){if(k!=='default'){var d=Object.getOwnPropertyDescriptor(e,k);Object.defineProperty(n,k,d.get?d:{enumerable:true,get:function(){return e[k]}});}})}n.default=e;return Object.freeze(n)}var Q__default=/*#__PURE__*/_interopDefault(Q);var X__namespace=/*#__PURE__*/_interopNamespace(X);var P__default=/*#__PURE__*/_interopDefault(P);var te=Object.defineProperty,re=Object.defineProperties;var oe=Object.getOwnPropertyDescriptors;var K=Object.getOwnPropertySymbols;var ne=Object.prototype.hasOwnProperty,ie=Object.prototype.propertyIsEnumerable;var F=(r,e,t)=>e in r?te(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t,L=(r,e)=>{for(var t in e||(e={}))ne.call(e,t)&&F(r,t,e[t]);if(K)for(var t of K(e))ie.call(e,t)&&F(r,t,e[t]);return r},E=(r,e)=>re(r,oe(e));var b=(r=>typeof require!="undefined"?require:typeof Proxy!="undefined"?new Proxy(r,{get:(e,t)=>(typeof require!="undefined"?require:e)[t]}):r)(function(r){if(typeof require!="undefined")return require.apply(this,arguments);throw Error('Dynamic require of "'+r+'" is not supported')});var se=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);var U=se((Ae,m)=>{var ae=b("module"),D=m.constructor.length>1?m.constructor:ae,A=b("path"),C=[],x={},W=[],ce=D._nodeModulePaths;D._nodeModulePaths=function(r){var e=ce.call(this,r);return r.indexOf("node_modules")===-1&&(e=C.concat(e)),e};var le=D._resolveFilename;D._resolveFilename=function(r,e,t,o){for(var s=W.length;s-- >0;){var a=W[s];if(N(r,a)){var i=x[a];if(typeof x[a]=="function"){var l=e.filename;if(i=x[a](l,r,a),!i||typeof i!="string")throw new Error("[module-alias] Expecting custom handler function to return path.")}r=A.join(i,r.substr(a.length));break}}return le.call(this,r,e,t,o)};function N(r,e){return r.indexOf(e)===0&&(r.length===e.length||r[e.length]==="/")}function k(r,e){r=A.normalize(r),e&&e.indexOf(r)===-1&&e.unshift(r);}function q(r,e){if(e){var t=e.indexOf(r);t!==-1&&e.splice(t,1);}}function G(r){var e;if(r=A.normalize(r),C.indexOf(r)===-1){C.push(r);var t=B();for(t&&k(r,t.paths),e=m.parent;e&&e!==t;)k(r,e.paths),e=e.parent;}}function H(r){for(var e in r)z(e,r[e]);}function z(r,e){x[r]=e,W=Object.keys(x),W.sort();}function de(){var r=B();C.forEach(function(e){r&&q(e,r.paths),Object.getOwnPropertyNames(b.cache).forEach(function(o){o.indexOf(e)!==-1&&delete b.cache[o];});for(var t=m.parent;t&&t!==r;)q(e,t.paths),t=t.parent;}),C=[],x={},W=[];}function he(r){typeof r=="string"&&(r={base:r}),r=r||{};var e;r.base?e=[A.resolve(r.base.replace(/\/package\.json$/,""))]:e=[A.join(__dirname,"../.."),process.cwd()];var t,o;for(var s in e)try{o=e[s],t=b(A.join(o,"package.json"));break}catch(n){}if(typeof t!="object"){var a=e.join(`,
`);throw new Error(`Unable to find package.json in any of:
[`+a+"]")}var i=t._moduleAliases||{};for(var l in i)i[l][0]!=="/"&&(i[l]=A.join(o,i[l]));H(i),t._moduleDirectories instanceof Array&&t._moduleDirectories.forEach(function(n){if(n!=="node_modules"){var d=A.join(o,n);G(d);}});}function B(){return b.main._simulateRepl?void 0:b.main}m.exports=he;m.exports.addPath=G;m.exports.addAlias=z;m.exports.addAliases=H;m.exports.isPathMatchesAlias=N;m.exports.reset=de;});U()();var ue=zod.z.object({latitude:zod.z.string().transform(Number).pipe(zod.z.number().min(-90).max(90)),longitude:zod.z.string().transform(Number).pipe(zod.z.number().min(-180).max(180)),radius:zod.z.string().transform(Number).pipe(zod.z.number().positive()),weatherCondition:zod.z.string().optional(),date:zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}),_=class{constructor(e){this.locationService=e;}async search(e,t){try{let o=ue.safeParse(e.query);if(!o.success)return t.status(400).json({errors:o.error.errors});let s=await this.locationService.findLocations(o.data);return t.json(s)}catch(o){return console.error("Error in location search:",o),t.status(500).json({error:"Internal server error"})}}};var u=class{constructor(){this.isConnected=!1;this.client=redis.createClient({password:process.env.REDIS_PASSWORD,socket:{host:process.env.REDIS_HOST,port:parseInt(process.env.REDIS_PORT||"14158")}}),this.client.on("error",e=>console.error("Redis Client Error",e)),this.client.on("connect",()=>console.log("Redis Client Connected")),this.client.on("ready",()=>{this.isConnected=!0,console.log("Redis Client Ready");}),this.client.on("end",()=>{this.isConnected=!1,console.log("Redis Client Connection Ended");}),this.connect();}async connect(){this.isConnected||await this.client.connect();}async get(e){try{let t=await this.client.get(e);return t?JSON.parse(t):void 0}catch(t){console.error("Redis Get Error:",t);return}}async set(e,t,o){try{let s=JSON.stringify(t);return o?await this.client.setEx(e,o,s):await this.client.set(e,s),!0}catch(s){return console.error("Redis Set Error:",s),!1}}async del(e){try{return await this.client.del(e)}catch(t){return console.error("Redis Del Error:",t),0}}async flush(){try{await this.client.flushAll();}catch(e){console.error("Redis Flush Error:",e);}}static generateKey(...e){return e.join(":")}async disconnect(){this.isConnected&&await this.client.quit();}};var I=class{constructor(e,t){this.locationRepository=e;this.weatherApi=t;this.cacheService=new u;}async findLocations(e){let t=u.generateKey("locations",e.latitude.toString(),e.longitude.toString(),e.radius.toString(),e.weatherCondition||"none",e.date||"current"),o=await this.cacheService.get(t);if(o)return console.log("Returning cached results"),o;console.log("Finding locations with params:",e);let s=await this.locationRepository.findWithinRadius(e.latitude,e.longitude,e.radius);if(console.log("Found initial locations:",s),e.weatherCondition){console.log("Filtering by weather condition:",e.weatherCondition);let a=await Promise.allSettled(s.map(async n=>{try{let d=await this.weatherApi.getWeather(n.latitude,n.longitude);return console.log(`Weather for ${n.city}:`,d),E(L({},n),{weather:d})}catch(d){return console.error(`Failed to fetch weather for ${n.city}:`,d),null}}));console.log("All weather results:",a);let i=e.weatherCondition.replace(/"/g,"").toLowerCase().trim(),l=a.filter(n=>n.status==="fulfilled").map(n=>n.value).filter(n=>{if(!n||!n.weather)return !1;let d=n.weather.condition.toLowerCase().trim();return console.log(`Comparing weather for ${n.city}:`,{requested:i,actual:d,matches:d.includes(i)}),d.includes(i)});return console.log("Filtered locations by weather:",l),this.cacheService.set(t,l,900),l}return s}};var M=class{constructor(e){this.weatherApi=e;}async findWithinRadius(e,t,o){console.log("Searching for cities within",o,"km of",e,t);let a=(await this.weatherApi.findNearbyCities(e,t,o)).filter(i=>i.distance<=o).sort((i,l)=>i.distance-l.distance);return console.log(`Found ${a.length} cities within ${o}km driving distance`),a}};var $=class{constructor(){if(this.weatherApiKey=process.env.WEATHER_API_KEY,this.googleMapsKey=process.env.GOOGLE_MAPS_API_KEY,!this.weatherApiKey)throw new Error("Weather API key is not configured");if(!this.googleMapsKey)throw new Error("Google Maps API key is not configured");this.cacheService=new u;}async findNearbyCities(e,t,o=100){var i,l;let s=u.generateKey("cities",e.toString(),t.toString(),o.toString()),a=await this.cacheService.get(s)||[];if(a.length>0)return console.log("Returning cached cities"),a;try{let n=[],d=this.calculateBBox(e,t,o),y=await P__default.default.get("https://nominatim.openstreetmap.org/search",{params:{format:"json","accept-language":"en",addressdetails:1,limit:50,q:"[place=city] OR [place=town]",viewbox:d,bounded:1},headers:{"User-Agent":"TravelTracer/1.0"}});if(console.log("Raw Nominatim response:",y.data),y.data&&Array.isArray(y.data)){let p=y.data.filter(c=>c.class==="place"&&["city","town","village"].includes(c.type)).map(c=>{let g=this.calculateDistance(e,t,parseFloat(c.lat),parseFloat(c.lon));return {city:c.name,state:c.address.state,country:c.address.country||"",latitude:parseFloat(c.lat),longitude:parseFloat(c.lon),distance:g,weather:void 0}}).filter(c=>c.distance<=o);n.push(...p);}let f=await P__default.default.get("https://nominatim.openstreetmap.org/search",{params:{format:"json","accept-language":"en",addressdetails:1,limit:50,q:"[place=village]",viewbox:d,bounded:1},headers:{"User-Agent":"TravelTracer/1.0"}});if(f.data&&Array.isArray(f.data)){let p=f.data.filter(c=>c.class==="place"&&c.type==="village").map(c=>{let g=this.calculateDistance(e,t,parseFloat(c.lat),parseFloat(c.lon));return {city:c.name,state:c.address.state,country:c.address.country||"",latitude:parseFloat(c.lat),longitude:parseFloat(c.lon),distance:g,weather:void 0}}).filter(c=>c.distance<=o);n.push(...p);}let h=await this.addDrivingDistances(e,t,n),R=this.removeDuplicates(h);return console.log(`Found ${R.length} unique cities within ${o}km radius`),this.cacheService.set(s,R,3600),R.sort((p,c)=>p.distance-c.distance)}catch(n){throw P__default.default.isAxiosError(n)&&console.error("Location Search Error:",{status:(i=n.response)==null?void 0:i.status,data:(l=n.response)==null?void 0:l.data,message:n.message}),new Error("Failed to fetch nearby cities")}}calculateBBox(e,t,o){let s=o/111.32,a=o/(111.32*Math.cos(e*Math.PI/180)),i=t-a,l=e-s,n=t+a,d=e+s;return `${i},${l},${n},${d}`}removeDuplicates(e){let t=new Map;return e.forEach(o=>{var i;let s=`${o.city.toLowerCase()}-${((i=o.state)==null?void 0:i.toLowerCase())||""}-${o.country.toLowerCase()}`,a=t.get(s);(!a||o.distance<a.distance)&&t.set(s,o);}),Array.from(t.values())}async getWeather(e,t,o){var i,l,n,d,y,f,h,R,p,c;let s=u.generateKey("weather",e.toString(),t.toString(),o||"current"),a=await this.cacheService.get(s);if(a)return console.log("Returning cached weather"),a;try{if(!o){let v=await P__default.default.get("http://api.weatherapi.com/v1/current.json",{params:{key:this.weatherApiKey,q:`${e},${t}`}});if(!((i=v.data)!=null&&i.current))throw new Error("Invalid response from Weather API");return {temperature:v.data.current.temp_c,condition:v.data.current.condition.text}}let g=new Date,ee=new Date(o).getTime()-g.getTime(),O=Math.ceil(ee/(1e3*60*60*24));if(O>14)throw new Error("Can only fetch weather up to 14 days in the future");if(O>0){let v=await P__default.default.get("http://api.weatherapi.com/v1/forecast.json",{params:{key:this.weatherApiKey,q:`${e},${t}`,days:O+1,dt:o}});if(!((d=(n=(l=v.data)==null?void 0:l.forecast)==null?void 0:n.forecastday)!=null&&d[0]))throw new Error("Invalid response from Weather API");let S=v.data.forecast.forecastday[0];return {temperature:S.day.avgtemp_c,condition:S.day.condition.text,date:S.date}}else {let v=await P__default.default.get("http://api.weatherapi.com/v1/history.json",{params:{key:this.weatherApiKey,q:`${e},${t}`,dt:o}});if(!((R=(h=(f=(y=v.data)==null?void 0:y.history)==null?void 0:f.forecast)==null?void 0:h.forecastday)!=null&&R[0]))throw new Error("Invalid response from Weather API");let S=v.data.history.forecast.forecastday[0];return {temperature:S.day.avgtemp_c,condition:S.day.condition.text,date:S.date}}}catch(g){throw P__default.default.isAxiosError(g)&&console.error("Weather API Error:",{status:(p=g.response)==null?void 0:p.status,data:(c=g.response)==null?void 0:c.data,message:g.message}),new Error("Failed to fetch weather data")}}calculateDistance(e,t,o,s){let i=(o-e)*(Math.PI/180),l=(s-t)*(Math.PI/180),n=Math.sin(i/2)*Math.sin(i/2)+Math.cos(e*(Math.PI/180))*Math.cos(o*(Math.PI/180))*Math.sin(l/2)*Math.sin(l/2),d=2*Math.atan2(Math.sqrt(n),Math.sqrt(1-n));return Math.round(6371*d)}async addDrivingDistances(e,t,o){let s=u.generateKey("distances",e.toString(),t.toString(),o.map(i=>`${i.latitude},${i.longitude}`).join(",")),a=await this.cacheService.get(s)||[];if(a.length>0)return console.log("Returning cached distances"),a;try{let l=[];for(let d=0;d<o.length;d+=25)l.push(o.slice(d,d+25));let n=[];for(let d of l){let y=d.map(h=>`${h.latitude},${h.longitude}`).join("|"),f=await P__default.default.get("https://maps.googleapis.com/maps/api/distancematrix/json",{params:{origins:`${e},${t}`,destinations:y,mode:"driving",key:this.googleMapsKey}});console.log("Google Distance Response:",f.data),f.data.status==="OK"&&d.forEach((h,R)=>{let p=f.data.rows[0].elements[R];p.status==="OK"?n.push(E(L({},h),{distance:Math.round(p.distance.value/1e3),straightLineDistance:this.calculateDistance(e,t,h.latitude,h.longitude)})):n.push(E(L({},h),{distance:this.calculateDistance(e,t,h.latitude,h.longitude)}));}),await new Promise(h=>setTimeout(h,1e3));}return this.cacheService.set(s,n,86400),n}catch(i){return console.error("Error calculating driving distances:",i),o.map(l=>E(L({},l),{distance:this.calculateDistance(e,t,l.latitude,l.longitude)}))}}};var Y=Q.Router(),J=new $,fe=new M(J),ge=new I(fe,J),ye=new _(ge);Y.get("/search",(r,e)=>ye.search(r,e));var V=Y;X__namespace.config({path:path.resolve(__dirname,"../.env")});var T=Q__default.default(),j=process.env.PORT||3e3;T.use(Q__default.default.json());T.use("/api/locations",V);var we=T.listen(j,()=>{console.log(`Server is running on port ${j}`),console.log(`API URL: ${process.env.RAILWAY_STATIC_URL||"http://localhost:"+j}`),console.log("Environment variables loaded:",{WEATHER_API_KEY:process.env.WEATHER_API_KEY?"Set":"Not set",PORT:process.env.PORT});});process.on("SIGTERM",Z);process.on("SIGINT",Z);async function Z(){console.log("Received kill signal, shutting down gracefully"),we.close(()=>{console.log("HTTP server closed");});try{await new u().disconnect(),console.log("Redis connection closed"),process.exit(0);}catch(r){console.error("Error during shutdown:",r),process.exit(1);}}
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map