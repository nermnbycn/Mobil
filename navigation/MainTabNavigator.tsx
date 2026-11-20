
import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../redux/Store";
import { fetchUnreadCount } from "../redux/slices/NotificationSlice";

import HomeNavigator from "./HomeNavigator";
import type { HomeStackParamList } from "./HomeNavigator";

import MessageNavigator from "./MessageNavigator";
import NotificationNavigator from "./NotificationNavigator";
import ProfileNavigator from "./ProfileNavigator";

import { navigationRef } from "./NavigationService";
import { useHeaderScroll } from "../context/HeaderScrollContext";

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  MessageTab: undefined;
  SuperAppTab: undefined;
  NotificationTab: undefined;
  ProfileTab: undefined;
};

interface MainTabNavigatorProps {
  onSuperAppPress: () => void;
  onLogout: () => Promise<void>;

  // App.tsx üzerinden gelen yönlendirme
  onShortcutPress?: (key: string) => void;
}

type IconName =
  React.ComponentProps<typeof Ionicons>["name"];

type TabIconProps = {
  focused: boolean;
  activeName: IconName;
  inactiveName: IconName;
  offsetY: number;
  iconSize: number;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function EmptySuperAppScreen() {
  return null;
}

const COLORS = {
  primary: "#1D2749",
  white: "#FFFFFF",
  centerOuter: "#DBE4F5",
  notification: "#DC2626",
};

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.min(Math.max(value, min), max);

function TabIcon({
  focused,
  activeName,
  inactiveName,
  offsetY,
  iconSize,
}: TabIconProps) {
  return (
    <View
      style={[
        styles.tabIconCenter,
        {
          transform: [{ translateY: offsetY }],
        },
      ]}
    >
      <Ionicons
        name={focused ? activeName : inactiveName}
        size={iconSize}
        color={COLORS.primary}
      />
    </View>
  );
}

export default function MainTabNavigator({
  onSuperAppPress,
  onLogout,
  onShortcutPress,
}: MainTabNavigatorProps) {
  const dispatch = useDispatch<AppDispatch>();

  const unreadCount = useSelector(
    (state: RootState) =>
      state.notification.unreadCount ?? 0
  );

  useEffect(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const insets = useSafeAreaInsets();

  const {
    setCollapsed,
    resetHomeShortcut,
  } = useHeaderScroll();

  const { width, height } = useWindowDimensions();

  const shortestSide = Math.min(width, height);

  const responsiveScale = clamp(
    shortestSide / 430,
    1,
    1.5
  );

  const barScale = Math.min(responsiveScale, 1.15);
  const buttonScale = Math.min(responsiveScale, 1.35);

  const tabHeight = 66 * barScale;
  const tabBarHeight = tabHeight + insets.bottom;
  const iconSize = 29 * barScale;

  const iconOffset = -insets.bottom / 2 + 30;

  const centerOuterSize = 80 * buttonScale;
  const centerInnerSize = 62 * buttonScale;
  const centerIconSize = 27 * buttonScale;

  const centerButtonTop = -44 * buttonScale;

  const isActive = (
    navigation: {
      getState: () => {
        index: number;
        routes: { name: string }[];
      };
    },
    screenName: string
  ) => {
    const state = navigation.getState();

    return state.routes[state.index]?.name === screenName;
  };

  const getItemStyle = (_active: boolean) => ({
    backgroundColor: COLORS.white,
    padding: 0,
    margin: 0,
    height: "100%" as const,
  });

  const renderTabIcon = (
    focused: boolean,
    activeName: IconName,
    inactiveName: IconName
  ) => (
    <TabIcon
      focused={focused}
      activeName={activeName}
      inactiveName={inactiveName}
      offsetY={iconOffset}
      iconSize={iconSize}
    />
  );

  // HEADER KISAYOL KARTLARI
  const handleShortcutPress = (key: string) => {
    setCollapsed(false);

    // App.tsx üzerinden fonksiyon geldiyse onu kullan
    if (onShortcutPress) {
      onShortcutPress(key);
      return;
    }

    // App.tsx üzerinden fonksiyon gelmezse
    // mevcut yönlendirme sistemini kullan
    if (!navigationRef.isReady()) return;

    const screens: Record<
      string,
      keyof HomeStackParamList
    > = {
      overview: "Home",
      blogs: "Blog",
      news: "CompanyNew",
      announcement: "Announcement",
      surveys: "Survey",
    };

    const screen = screens[key];

    if (!screen) return;

    switch (screen) {
      case "Home":
      case "Blog":
      case "CompanyNew":
      case "Announcement":
      case "Survey":
        navigationRef.navigate("HomeTab", {
          screen,
        });
        break;
    }
  };

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          elevation: 12,
          shadowColor: "#000000",
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },

        tabBarItemStyle: {
          padding: 0,
          margin: 0,
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      {/* ANA SAYFA */}
      <Tab.Screen
        name="HomeTab"
        listeners={({ navigation }) => ({
          tabPress: () => {
            resetHomeShortcut();
            setCollapsed(false);

            navigation.navigate("HomeTab", {
              screen: "Home",
            });
          },
        })}
        options={({ navigation }) => ({
          tabBarItemStyle: getItemStyle(
            isActive(navigation, "HomeTab")
          ),

          tabBarIcon: ({ focused }) =>
            renderTabIcon(
              focused,
              "home",
              "home-outline"
            ),
        })}
      >
        {() => (
          <HomeNavigator
            onShortcutPress={handleShortcutPress}
          />
        )}
      </Tab.Screen>

      {/* KUTLAMA MESAJLARI */}
      <Tab.Screen
        name="MessageTab"
        component={MessageNavigator}
        options={({ navigation }) => ({
          lazy: false,

          tabBarItemStyle: getItemStyle(
            isActive(navigation, "MessageTab")
          ),

          tabBarIcon: ({ focused }) =>
            renderTabIcon(
              focused,
              "chatbubble-ellipses",
              "chatbubble-ellipses-outline"
            ),
        })}
      />

      {/* SUPER APP */}
      <Tab.Screen
        name="SuperAppTab"
        component={EmptySuperAppScreen}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            onSuperAppPress();
          },
        }}
        options={{
          tabBarItemStyle: getItemStyle(false),

          tabBarIcon: () => (
            <View
              style={[
                styles.centerButtonOuter,
                {
                  top: centerButtonTop,
                  width: centerOuterSize,
                  height: centerOuterSize,
                  borderRadius: centerOuterSize / 2,
                },
              ]}
            >
              <View
                style={[
                  styles.centerButton,
                  {
                    width: centerInnerSize,
                    height: centerInnerSize,
                    borderRadius: centerInnerSize / 2,
                  },
                ]}
              >
                <Ionicons
                  name="grid"
                  size={centerIconSize}
                  color={COLORS.primary}
                />
              </View>
            </View>
          ),
        }}
      />

      {/* BİLDİRİMLER */}
      <Tab.Screen
        name="NotificationTab"
        component={NotificationNavigator}
        listeners={{
          focus: () => {
            dispatch(fetchUnreadCount());
          },
        }}
        options={({ navigation }) => ({
          tabBarItemStyle: getItemStyle(
            isActive(navigation, "NotificationTab")
          ),

          tabBarIcon: ({ focused }) =>
            renderTabIcon(
              focused,
              "notifications",
              "notifications-outline"
            ),

          // OKUNMAMIŞ BİLDİRİM SAYISI
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : unreadCount
              : undefined,

          tabBarBadgeStyle: {
            backgroundColor: COLORS.notification,
            color: COLORS.white,
            fontSize: 10,
            fontWeight: "800",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            textAlign: "center",
            top: 8,
          },
        })}
      />

      {/* PROFİL */}
      <Tab.Screen
        name="ProfileTab"
        options={({ navigation }) => ({
          tabBarItemStyle: getItemStyle(
            isActive(navigation, "ProfileTab")
          ),

          tabBarIcon: ({ focused }) =>
            renderTabIcon(
              focused,
              "person",
              "person-outline"
            ),
        })}
      >
        {() => (
          <ProfileNavigator onLogout={onLogout} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },

  centerButtonOuter: {
    position: "absolute",
    backgroundColor: COLORS.centerOuter,
    alignItems: "center",
    justifyContent: "center",
  },

  centerButton: {
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#FFFFFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
});
