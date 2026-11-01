import { useState } from "react";
import { View, Text, ScrollView, Image, Pressable, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";

const gold = "#D9AE55";
const cars = [
  { id:"bmw-x5", name:"BMW X5", year:"2023", mileage:"45 000 км", price:"12 990 000 ₽", image:"https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1000&q=85", tag:"В наличии" },
  { id:"mercedes-gle", name:"Mercedes-Benz GLE", year:"2023", mileage:"32 000 км", price:"14 500 000 ₽", image:"https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1000&q=85", tag:"Проверен" },
  { id:"porsche-cayenne", name:"Porsche Cayenne", year:"2022", mileage:"28 000 км", price:"13 800 000 ₽", image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=85", tag:"В наличии" }
];

export default function Home() {
  const [tab,setTab] = useState("Главная");
  const [favorites,setFavorites] = useState<string[]>([]);
  const [query,setQuery] = useState("");
  const shown = cars.filter(c=>c.name.toLowerCase().includes(query.toLowerCase()));
  return <View style={s.root}>
    <View style={s.header}>
      <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>A</Text></View><Text style={s.brand}>alex.topcars</Text></View>
      <Pressable onPress={()=>router.push({pathname:"/favorites",params:{ids:favorites.join(",")}})}><Text style={s.headerIcon}>♡</Text></Pressable>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
      <View style={s.hero}>
        <Image source={{uri:"https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1400&q=90"}} style={s.heroImage}/>
        <View style={s.heroShade}/>
        <View style={s.heroContent}>
          <Text style={s.eyebrow}>ALEX.TOPCARS • АВТОМОБИЛИ</Text>
          <Text style={s.heroTitle}>Мечтай.{ "\n" }Выбирай.{ "\n" }Покупай.</Text>
          <Text style={s.heroSub}>Подбор, покупка и доставка автомобилей по всей России</Text>
          <Pressable style={s.goldButton} onPress={()=>router.push("/catalog")}><Text style={s.goldButtonText}>Смотреть каталог  →</Text></Pressable>
        </View>
      </View>
      <View style={s.quickRow}>
        {["Авто в наличии","Под заказ","Доставка"].map((v,i)=><Pressable key={v} style={s.quick} onPress={()=>setTab("Каталог")}><Text style={s.quickIcon}>{["◈","⌕","↗"][i]}</Text><Text style={s.quickText}>{v}</Text></Pressable>)}
      </View>
      <View style={s.sectionHead}><Text style={s.sectionTitle}>Автомобили для вас</Text><Pressable onPress={()=>setTab("Каталог")}><Text style={s.more}>Все автомобили →</Text></Pressable></View>
      <View style={s.search}><Text style={{color:"#888",fontSize:17}}>⌕</Text><TextInput placeholder="Марка или модель" placeholderTextColor="#777" value={query} onChangeText={setQuery} style={s.searchInput}/></View>
      {shown.filter(c=>tab!=="Избранное" || favorites.includes(c.id)).map(car=><Pressable key={car.id} style={s.carCard} onPress={()=>router.push({pathname:"/vehicle/[id]",params:{id:car.id}})}>
        <View><Image source={{uri:car.image}} style={s.carImage}/><View style={s.tag}><Text style={s.tagText}>{car.tag}</Text></View><Pressable style={s.heart} onPress={()=>setFavorites(p=>p.includes(car.id)?p.filter(x=>x!==car.id):[...p,car.id])}><Text style={{fontSize:24,color:favorites.includes(car.id)?gold:"#fff"}}>{favorites.includes(car.id)?"♥":"♡"}</Text></Pressable></View>
        <View style={s.carInfo}><View style={{flex:1}}><Text style={s.carName}>{car.name}</Text><Text style={s.carMeta}>{car.year}  •  {car.mileage}</Text><Text style={s.carPrice}>{car.price}</Text></View><Text style={s.details}>Подробнее</Text></View>
      </Pressable>)}
      <View style={s.serviceBox}><Text style={s.serviceTitle}>Не нашли нужный автомобиль?</Text><Text style={s.serviceCopy}>Подберём автомобиль под ваш бюджет и пожелания</Text><Pressable style={s.outlineButton} onPress={()=>router.push("/request")}><Text style={s.outlineText}>Оставить заявку</Text></Pressable></View>
      <Text style={s.disclaimer}>Демонстрационный каталог. Цены и наличие требуют подтверждения.</Text>
    </ScrollView>
    <View style={s.nav}>{["Главная","Каталог","Избранное","Профиль"].map((v,i)=><Pressable key={v} style={s.navItem} onPress={()=>{if(v==="Каталог"){setQuery("");router.push("/catalog");}else if(v==="Избранное"){router.push({pathname:"/favorites",params:{ids:favorites.join(",")}});}else if(v==="Профиль"){router.push("/profile");}else{router.replace("/");}}}><Text style={[s.navIcon,tab===v&&s.active]}>{["⌂","▦","♡","○"][i]}</Text><Text style={[s.navLabel,tab===v&&s.active]}>{v}</Text></Pressable>)}</View>
  </View>;
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:"#090A0C",paddingTop:52},header:{height:48,paddingHorizontal:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},brandRow:{flexDirection:"row",alignItems:"center",gap:9},logo:{width:30,height:30,borderWidth:1.5,borderColor:gold,borderRadius:9,alignItems:"center",justifyContent:"center"},logoText:{color:gold,fontSize:20,fontWeight:"800"},brand:{color:"#fff",fontSize:18,fontWeight:"800",letterSpacing:.3},headerIcon:{fontSize:30,color:"#fff"},hero:{height:390,margin:16,borderRadius:22,overflow:"hidden",justifyContent:"flex-end"},heroImage:{...StyleSheet.absoluteFillObject,width:"100%",height:"100%"},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.42)"},heroContent:{padding:22},eyebrow:{color:gold,fontSize:10,fontWeight:"800",letterSpacing:2,marginBottom:12},heroTitle:{color:"#fff",fontSize:38,fontWeight:"900",lineHeight:42},heroSub:{color:"#E2E2E2",fontSize:14,lineHeight:21,marginTop:12,maxWidth:260},goldButton:{backgroundColor:gold,borderRadius:12,paddingVertical:15,paddingHorizontal:18,alignSelf:"flex-start",marginTop:20},goldButtonText:{color:"#17130A",fontWeight:"800",fontSize:14},quickRow:{flexDirection:"row",gap:10,paddingHorizontal:16,marginBottom:28},quick:{flex:1,backgroundColor:"#141619",borderColor:"#282B30",borderWidth:1,borderRadius:14,padding:13,minHeight:82,justifyContent:"center"},quickIcon:{color:gold,fontSize:23,marginBottom:7},quickText:{color:"#eee",fontSize:11,fontWeight:"600"},sectionHead:{paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:14},sectionTitle:{color:"#fff",fontSize:20,fontWeight:"800"},more:{color:gold,fontSize:12,fontWeight:"700"},search:{marginHorizontal:16,marginBottom:14,backgroundColor:"#15171A",borderRadius:12,borderWidth:1,borderColor:"#292C30",paddingHorizontal:14,height:48,flexDirection:"row",alignItems:"center",gap:10},searchInput:{flex:1,color:"#fff",fontSize:14},carCard:{marginHorizontal:16,marginBottom:16,backgroundColor:"#15171A",borderRadius:18,overflow:"hidden",borderWidth:1,borderColor:"#292C30"},carImage:{width:"100%",height:190,backgroundColor:"#222"},tag:{position:"absolute",top:12,left:12,backgroundColor:"#101512",paddingHorizontal:10,paddingVertical:6,borderRadius:20},tagText:{color:"#B9D7B7",fontSize:10,fontWeight:"700"},heart:{position:"absolute",right:12,top:8,width:38,height:38,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,.4)",borderRadius:20},carInfo:{padding:15,flexDirection:"row",alignItems:"center"},carName:{color:"#fff",fontSize:18,fontWeight:"800"},carMeta:{color:"#9A9DA2",fontSize:12,marginTop:5},carPrice:{color:"#fff",fontSize:18,fontWeight:"900",marginTop:10},details:{backgroundColor:gold,borderRadius:10,paddingHorizontal:13,paddingVertical:11,color:"#17130A",fontWeight:"800",fontSize:12,overflow:"hidden"},serviceBox:{margin:16,padding:20,borderRadius:18,backgroundColor:"#17191C",borderWidth:1,borderColor:"#3A3020"},serviceTitle:{color:"#fff",fontSize:19,fontWeight:"800"},serviceCopy:{color:"#AEB0B4",fontSize:13,marginTop:8,lineHeight:19},outlineButton:{borderWidth:1,borderColor:gold,borderRadius:10,padding:13,alignItems:"center",marginTop:16},outlineText:{color:gold,fontWeight:"800"},disclaimer:{color:"#777",fontSize:10,textAlign:"center",marginHorizontal:20,marginBottom:20},nav:{position:"absolute",bottom:0,left:0,right:0,height:78,backgroundColor:"#101214",borderTopWidth:1,borderTopColor:"#292C30",flexDirection:"row",justifyContent:"space-around",paddingTop:10},navItem:{alignItems:"center",flex:1},navIcon:{color:"#85888D",fontSize:23},navLabel:{color:"#85888D",fontSize:10,marginTop:4},active:{color:gold}
});
