
import React, {
  createContext,
  useContext,
  useState,
} from "react";

interface HeaderScrollContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;

  isHomeTab: boolean;
  setIsHomeTab: (value: boolean) => void;

  homePressCount: number;
  resetHomeShortcut: () => void;
}

const HeaderScrollContext =
  createContext<HeaderScrollContextType>({
    collapsed: false,
    setCollapsed: () => {},

    isHomeTab: true,
    setIsHomeTab: () => {},

    homePressCount: 0,
    resetHomeShortcut: () => {},
  });

export function HeaderScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isHomeTab, setIsHomeTab] = useState(true);
  const [homePressCount, setHomePressCount] = useState(0);

  const resetHomeShortcut = () => {
    setHomePressCount((prev) => prev + 1);
  };

  return (
    <HeaderScrollContext.Provider
      value={{
        collapsed,
        setCollapsed,
        isHomeTab,
        setIsHomeTab,
        homePressCount,
        resetHomeShortcut,
      }}
    >
      {children}
    </HeaderScrollContext.Provider>
  );
}

export const useHeaderScroll = () =>
  useContext(HeaderScrollContext);
