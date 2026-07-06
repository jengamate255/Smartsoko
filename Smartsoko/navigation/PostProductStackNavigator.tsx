import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PostProductScreen } from "../features/postProduct/PostProductScreen";

const Stack = createNativeStackNavigator();

export const PostProductStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PostProduct" component={PostProductScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
