import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  guests: number;
}

export interface Addons {
  tubeRental: boolean;
  captainService: boolean;
  fuelPackage: boolean;
  cooler: boolean;
}

export interface BookingState {
  boatId: string | null;
  startDate: Date;
  endDate: Date;
  customerDetails: CustomerDetails;
  addons: Addons;
  waiverAccepted: boolean;
  signature: string | null;
  pricing: {
    baseRate: number;
    subtotal: number;
    tax: number;
    total: number;
  };
}

export interface BookingContextType {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  resetState: () => void;
}

const getInitialState = (): BookingState => {
  const d1 = new Date();
  d1.setDate(d1.getDate() + 1);
  d1.setHours(9, 0, 0, 0);

  const d2 = new Date();
  d2.setDate(d2.getDate() + 1);
  d2.setHours(13, 0, 0, 0);

  return {
    boatId: null,
    startDate: d1,
    endDate: d2,
    customerDetails: {
      fullName: '',
      email: '',
      phone: '',
      guests: 2,
    },
    addons: {
      tubeRental: false,
      captainService: false,
      fuelPackage: false,
      cooler: false,
    },
    waiverAccepted: false,
    signature: null,
    pricing: {
      baseRate: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
    },
  };
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<BookingState>(getInitialState());

  const updateState = (updates: Partial<BookingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const resetState = () => {
    setState(getInitialState());
  };

  return (
    <BookingContext.Provider value={{ state, updateState, resetState }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingContext = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
};
