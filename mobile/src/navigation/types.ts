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

export type BookingStackParamList = {
  Step1_Schedule: { boatId: string };
  Step2_Customer: undefined;
  Step3_Addons: undefined;
  Step4_MarinaInfo: undefined;
  Step5_Weather: undefined;
  Step6_Waiver: undefined;
  Step7_Signature: undefined;
  Step8_Payment: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  MarinaDetail: { id: string };
  BoatDetail: { id: string };
  Booking: NavigatorScreenParams<BookingStackParamList>;
  Confirmation: { bookingId: string };
};

export type SearchStackParamList = {
  Search: undefined;
  MarinaDetail: { id: string };
  BoatDetail: { id: string };
  Booking: NavigatorScreenParams<BookingStackParamList>;
  Confirmation: { bookingId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};
