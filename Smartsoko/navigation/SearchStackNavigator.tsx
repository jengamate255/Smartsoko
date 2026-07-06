import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SearchScreen } from "../features/search/SearchScreen";

const Stack = createNativeStackNavigator();

export const SearchStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
