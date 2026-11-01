import { useMemo, useState } from "react";
import { View, Text, ScrollView, Image, Pressable, TextInput, StyleSheet } from "react-native";
import { router } from "expo-router";
const gold="#D9AE55";
const cars=[
{id:"bmw-x5",name:"BMW X5",year:"2023",mileage:"45 000 км",price:"12 990 000 ₽",image:"https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1000&q=85",tag:"В наличии",brand:"BMW"},
{id:"mercedes-gle",name:"Mercedes-Benz GLE",year:"2023",mileage:"32 000 км",price:"14 500 000 ₽",image:"https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1000&q=85",tag:"Проверен",brand:"Mercedes"},
{id:"porsche-cayenne",name:"Porsche Cayenne",year:"2022",mileage:"28 000 км",price:"13 800 000 ₽",image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=85",tag:"В наличии",brand:"Porsche"}
];
export default function Catalog(){
const [q,setQ]=useState(""); const [brand,setBrand]=useState("Все");
const filtered=useMemo(()=>cars.filter(c=>(brand==="Все"||c.brand===brand)&&c.name.toLowerCase().includes(q.toLowerCase())),[q,brand]);
return <View style={s.root}><View style={s.header}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹</Text></Pressable><Text style={s.title}>Каталог</Text><View style={{width:28}}/></View>
<ScrollView contentContainerStyle={{paddingBottom:35}}><Text style={s.sub}>Подберите автомобиль под себя</Text><View style={s.search}><Text style={{color:gold,fontSize:19}}>⌕</Text><TextInput value={q} onChangeText={setQ} placeholder="Марка или модель" placeholderTextColor="#777" style={s.input}/></View>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:17,gap:8,marginBottom:18}}>{["Все","BMW","Mercedes","Porsche"].map(b=><Pressable key={b} onPress={()=>setBrand(b)} style={[s.chip,brand===b&&s.chipActive]}><Text style={[s.chipText,brand===b&&s.chipTextActive]}>{b}</Text></Pressable>)}</ScrollView>
<Text style={s.count}>Найдено автомобилей: {filtered.length}</Text>
{filtered.map(c=><Pressable key={c.id} style={s.card} onPress={()=>router.push({pathname:"/vehicle/[id]",params:{id:c.id}})}><Image source={{uri:c.image}} style={s.photo}/><View style={s.info}><Text style={s.name}>{c.name}</Text><Text style={s.meta}>{c.year}  •  {c.mileage}</Text><View style={s.bottom}><Text style={s.price}>{c.price}</Text><Text style={s.more}>Подробнее →</Text></View></View></Pressable>)}
{filtered.length===0&&<Text style={s.empty}>По вашему запросу пока ничего не найдено.</Text>}
</ScrollView></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#090A0C",paddingTop:55},header:{height:45,paddingHorizontal:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},back:{color:gold,fontSize:32},title:{color:"#fff",fontSize:20,fontWeight:"900"},sub:{color:"#AEB0B4",fontSize:14,marginHorizontal:20,marginTop:12,marginBottom:16},search:{marginHorizontal:16,marginBottom:15,backgroundColor:"#17191C",borderRadius:12,borderWidth:1,borderColor:"#303338",paddingHorizontal:14,height:48,flexDirection:"row",alignItems:"center",gap:10},input:{flex:1,color:"#fff"},chip:{paddingHorizontal:17,paddingVertical:10,borderRadius:30,borderWidth:1,borderColor:"#35383D",backgroundColor:"#15171A"},chipActive:{backgroundColor:gold,borderColor:gold},chipText:{color:"#BFC1C4",fontSize:12,fontWeight:"700"},chipTextActive:{color:"#17130A"},count:{color:"#777",fontSize:11,marginHorizontal:19,marginBottom:12},card:{marginHorizontal:16,marginBottom:15,backgroundColor:"#17191C",borderRadius:17,overflow:"hidden",borderWidth:1,borderColor:"#2B2E33"},photo:{width:"100%",height:185},info:{padding:15},name:{color:"#fff",fontSize:18,fontWeight:"900"},meta:{color:"#989BA0",fontSize:12,marginTop:5},bottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:13},price:{color:gold,fontSize:17,fontWeight:"900"},more:{color:"#E5E5E5",fontSize:12,fontWeight:"700"},empty:{color:"#aaa",textAlign:"center",marginTop:40}});
