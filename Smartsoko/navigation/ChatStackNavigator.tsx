import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatScreen } from "../features/chat/ChatScreen";
import { ChatDetailScreen } from "../features/chat/ChatDetailScreen";

const Stack = createNativeStackNavigator();

export const ChatStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    </Stack.Navigator>
  );
}
