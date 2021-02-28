"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var t=require("fs/promises"),e=require("path"),i=require("jsdom");function r(t){return t&&"object"==typeof t&&"default"in t?t:{default:t}}var o=r(t),l=r(e);const n=new(new i.JSDOM("").window.DOMParser);async function s({filePath:t}){const e=await o.default.readFile(t,"utf-8"),i=n.parseFromString(e,"text/xml");let r;return!function(t){for(let e=0;e<t.children.length;++e){const i=t.children[e];if("map"===i.tagName&&null!=i.attributes.getNamedItem("tiledversion"))return!0}return!1}(i)?function(t){for(let e=0;e<t.children.length;++e){const i=t.children[e];if("tileset"===i.tagName&&null!=i.attributes.getNamedItem("tiledversion"))return!0}return!1}(i)&&(r={".amt":JSON.stringify(f(t,i,["collision"]))}):r={".amt":JSON.stringify(await p(t,i))},r}const a=Object.freeze({0:"None",1:"Full",2:"Ladder",3:"Platform",4:"SlopeLeft",5:"SlopeRight",6:"SlopeLeftBottom",7:"SlopeRightBottom",8:"SlopeLeftTop",9:"SlopeRightTop",None:0,Full:1,Ladder:2,Platform:3,SlopeLeft:4,SlopeRight:5,SlopeLeftBottom:6,SlopeRightBottom:7,SlopeLeftTop:8,SlopeRightTop:9});async function u(t){return f(t,n.parseFromString(await o.default.readFile(t,"utf-8"),"text/xml"))}async function g(t,e){const i=t.getAttribute("template");let r;null!=i&&(r=await async function(t){const e=n.parseFromString(await o.default.readFile(t,"utf-8"),"text/xml").getElementsByTagName("template")[0].getElementsByTagName("object")[0],i=c(e);return{type:e.getAttribute("type"),width:parseFloat(e.getAttribute("width"))??void 0,height:parseFloat(e.getAttribute("height"))??void 0,props:Object.keys(i??{}).length>0?i:void 0}}(l.default.join(e,i)));const s={...r?.props??{},...c(t)??{}},a=t.getAttribute("width")??r?.width??null,u=t.getAttribute("height")??r?.height??null;let g;if(null!=(g=t.querySelector("ellipse"))){return{base:"ellipse",type:r?.type??void 0,id:parseInt(t.getAttribute("id")),x:parseFloat(t.getAttribute("x")),y:parseFloat(t.getAttribute("y")),width:a,height:u,props:Object.keys(s).length>0?s:void 0}}if(null!=(g=t.querySelector("point"))){return{base:"point",type:r?.type??void 0,id:parseInt(t.getAttribute("id")),x:parseFloat(t.getAttribute("x")),y:parseFloat(t.getAttribute("y")),props:Object.keys(s).length>0?s:void 0}}if(null!=(g=t.querySelector("polygon"))){const e=parseFloat(t.getAttribute("x")),i=parseFloat(t.getAttribute("y")),o=[];for(const t of g.getAttribute("points").split(" ")){const r=t.indexOf(","),l=parseFloat(t.substr(0,r)),n=parseFloat(t.substr(r+1));o.push([e+l,i+n])}return{base:"polygon",type:r?.type??void 0,id:parseInt(t.getAttribute("id")),x:e,y:i,points:o,props:Object.keys(s).length>0?s:void 0}}if(null!=(g=t.querySelector("polyline"))){const e=parseFloat(t.getAttribute("x")),i=parseFloat(t.getAttribute("y")),o=[];for(const t of g.getAttribute("points").split(" ")){const r=t.indexOf(","),l=parseFloat(t.substr(0,r)),n=parseFloat(t.substr(r+1));o.push([e+l,i+n])}return{base:"polyline",type:r?.type??void 0,id:parseInt(t.getAttribute("id")),x:e,y:i,points:o,props:Object.keys(s).length>0?s:void 0}}if(null!=(g=t.querySelector("text"))){return{base:"text",type:r?.type??void 0,id:parseInt(t.getAttribute("id")),x:parseFloat(t.getAttribute("x")),y:parseFloat(t.getAttribute("y")),width:a,height:u,text:{size:g.getAttribute("pixelsize"),wrap:1===parseInt(g.getAttribute("wrap")),content:g.textContent},props:Object.keys(s).length>0?s:void 0}}{const e={type:r?.type??void 0,id:parseInt(t.getAttribute("id")),x:parseFloat(t.getAttribute("x")),y:parseFloat(t.getAttribute("y")),width:a,height:u,props:Object.keys(s).length>0?s:void 0},i=t.getAttribute("gid");return null!=i?(e.base="tile",e.tileId=i):e.base="rect",e}}async function p(t,e){const i=e.getElementsByTagName("map")[0],r={width:parseFloat(i.getAttribute("width")),height:parseFloat(i.getAttribute("height")),background:i.getAttribute("backgroundcolor"),tilesets:[],collision:[],tile:[],object:{}};let o=0;for(const t of i.getElementsByTagName("tileset")){const e=o++;r.tilesets[e]={id:e,firstgid:parseFloat(t.getAttribute("firstgid")),path:t.getAttribute("source")}}0===r.tilesets.length&&console.warn("");let n=[];for(const e of r.tilesets)n.push({id:e.id,firstgid:e.firstgid,data:await u(l.default.join(l.default.dirname(t),e.path.replace(".tsx",".xml")))});n=n.sort(((t,e)=>t.firstgid-e.firstgid)).reverse();const s=[...i.getElementsByTagName("group")[0].getElementsByTagName("layer")].sort(((t,e)=>parseFloat(t.getAttribute("name"))-parseFloat(e.getAttribute("name"))));for(let e=0;e<s.length;++e){const i=s[e].getElementsByTagName("data")[0].textContent.replace(/\s+/g,"").split(",");for(let o=0;o<i.length/r.width;++o)for(let l=0;l<i.length/r.height;++l){const s=l+o*r.width;let u,g,p=parseFloat(i[s]);if(p&=536870911,0===p)null==r.collision[s]&&(r.collision[s]=a.None),u=0,g=0;else{const i=n.find((t=>t.firstgid<=p));if(null==i)throw new Error(`[File '${t}'] Could not find tileset for layer#${e}, expected tileset.firstgid < ${p}`);const o=i.data.tiles[p-i.firstgid];if(null!=o.props?.collision){const t=a[o.props.collision];if(null==t)throw new Error(`Invalid CollisionKind ${o.props.collision}`);r.collision[s]=t}else null==r.collision[s]&&(r.collision[s]=a.None);u=i.id,g=p-i.firstgid+1}null==r.tile[e]&&(r.tile[e]=[]),r.tile[e][s]=u<<10>>>0|g<<0>>>0}}for(const e of i.getElementsByTagName("objectgroup")[0].getElementsByTagName("object")){const i=e.getAttribute("name");if(null==i)throw new Error(`[${t}] Object#${e.getAttribute("id")} is missing 'name'`);if(null!=r.object[i])throw new Error(`[${t}] Duplicate object name ${i}`);if(r.object[i]=await g(e,l.default.dirname(t)),"tile"===r.object[i].base){const e=n.find((t=>t.firstgid<=r.object[i].tileId));if(null==e)throw new Error(`[File '${t}'] Could not find tileset for entity '${i}', expected tileset.firstgid < ${r.object[i].gid}`);const o=e.id,l=r.object[i].tileId-e.firstgid;r.object[i].tileId=o<<10>>>0|l<<0>>>0}}for(let t=0;t<r.tilesets.length;++t)r.tilesets[t]=r.tilesets[t].path.replace(".xml",".amt");return r}function c(t,e=[]){const i=t.getElementsByTagName("properties")[0];if(null==i)return null;const r={};for(const t of i.getElementsByTagName("property")){const i=t.getAttribute("name");e.includes(i)||(r[t.getAttribute("name")]=t.getAttribute("value"))}return 0===Object.keys(r).length?null:r}function d(t){const e=t.getElementsByTagName("animation")[0];if(null==e)return null;const i=[];for(const t of e.getElementsByTagName("frame")){const e=parseInt(t.getAttribute("tileid"));i.push(e)}return i}function f(t,e,i=[]){const r=e.getElementsByTagName("tileset")[0],o=r.getElementsByTagName("image")[0].getAttribute("source"),l={};for(const t of r.getElementsByTagName("tile")){const e={},r=d(t);null!=r&&(e.anim=r);const o=c(t,i);null!=o&&(e.props=o),Object.keys(e).length>0&&(l[parseInt(t.getAttribute("id"))]=e)}return{image:o,tiles:l}}exports.default=function(){return{name:"snowpack-plugin-tiled",resolve:{input:[".xml"],output:[".amt"]},load:s}};