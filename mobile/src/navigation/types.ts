import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<TabParamList>;
};

export type TabParamList = {
  HomeStack: undefined;
  SearchStack: undefined;
  Favorites: undefined;
  Trips: undefined;
  Account: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  MarinaDetail: { id: string };
  BoatDetail: { id: string };
  BookingFlow: { boatId: string };
  Confirmation: { bookingId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  MarinaDetail: { id: string };
  BoatDetail: { id: string };
  BookingFlow: { boatId: string };
  Confirmation: { bookingId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};
