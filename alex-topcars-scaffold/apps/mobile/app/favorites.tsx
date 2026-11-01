import { useLocalSearchParams, router } from "expo-router";
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from "react-native";
const gold="#D9AE55";
const cars:any={
 "bmw-x5":{name:"BMW X5",year:"2023",mileage:"45 000 км",price:"12 990 000 ₽",image:"https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1000&q=85"},
 "mercedes-gle":{name:"Mercedes-Benz GLE",year:"2023",mileage:"32 000 км",price:"14 500 000 ₽",image:"https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1000&q=85"},
 "porsche-cayenne":{name:"Porsche Cayenne",year:"2022",mileage:"28 000 км",price:"13 800 000 ₽",image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=85"}
};
export default function Favorites(){
 const {ids=""}=useLocalSearchParams<{ids:string}>();
 const selected=String(ids).split(",").filter(Boolean).filter(id=>cars[id]);
 return <View style={s.root}><View style={s.header}><Pressable onPress={()=>router.back()}><Text style={s.back}>‹</Text></Pressable><Text style={s.title}>Избранное</Text><View style={{width:25}}/></View>
 <ScrollView contentContainerStyle={{paddingBottom:30}}>{selected.length===0?<View style={s.empty}><Text style={s.heart}>♡</Text><Text style={s.emptyTitle}>Пока ничего нет</Text><Text style={s.copy}>Добавляйте понравившиеся автомобили в избранное, чтобы вернуться к ним позже.</Text><Pressable style={s.button} onPress={()=>router.push("/catalog")}><Text style={s.buttonText}>Перейти в каталог</Text></Pressable></View>:selected.map(id=>{const car=cars[id];return <Pressable key={id} style={s.card} onPress={()=>router.push({pathname:"/vehicle/[id]",params:{id}})}><Image source={{uri:car.image}} style={s.photo}/><View style={s.info}><Text style={s.name}>{car.name}</Text><Text style={s.meta}>{car.year} • {car.mileage}</Text><Text style={s.price}>{car.price}</Text></View></Pressable>})}</ScrollView></View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#090A0C",paddingTop:55},header:{height:48,paddingHorizontal:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},back:{color:gold,fontSize:32},title:{color:"#fff",fontSize:20,fontWeight:"900"},empty:{alignItems:"center",paddingHorizontal:35,paddingTop:100},heart:{fontSize:64,color:gold},emptyTitle:{color:"#fff",fontSize:22,fontWeight:"900",marginTop:15},copy:{color:"#9A9DA2",fontSize:14,lineHeight:21,textAlign:"center",marginTop:9},button:{backgroundColor:gold,borderRadius:12,paddingHorizontal:24,paddingVertical:15,marginTop:25},buttonText:{color:"#17130A",fontWeight:"900"},card:{margin:16,backgroundColor:"#17191C",borderRadius:17,overflow:"hidden"},photo:{width:"100%",height:180},info:{padding:15},name:{color:"#fff",fontSize:18,fontWeight:"900"},meta:{color:"#999",marginTop:5},price:{color:gold,fontSize:18,fontWeight:"900",marginTop:10}});
