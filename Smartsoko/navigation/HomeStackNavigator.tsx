import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../features/home/HomeScreen";
import { ProductDetailScreen } from "../features/home/ProductDetailScreen";

const Stack = createNativeStackNavigator();

export const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}
