import React, { useState } from "react";
import LoginScreen from "../screens/LoginScreen";

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onAuthenticated: () => void;
  onForgotPassword: () => void;
  logOut: (userId?: string) => void | Promise<void>;
}

export default function AuthNavigator({ onLogin, onAuthenticated, onForgotPassword }: Props) {
  const [introPlayed, setIntroPlayed] = useState(false);

  return (
    <LoginScreen
      playIntro={!introPlayed}
      onIntroFinished={() => setIntroPlayed(true)}
      onLogin={onLogin}
      onAuthenticated={onAuthenticated}
      onForgotPassword={onForgotPassword}
    />
  );
}
