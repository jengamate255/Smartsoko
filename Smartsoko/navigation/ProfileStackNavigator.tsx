import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileScreen } from "../features/profile/ProfileScreen";

const Stack = createNativeStackNavigator();

export const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
