// Reduxized POS — files included in this single file for easy copy/paste
// ---------------------------------------------------------------
// FILE: store.ts
import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import productsReducer from "./slices/productsSlice";
import cartSlice from "./slices/cartSlice";
import tableReducer from "./slices/table";
export const store = configureStore({
  reducer: {
    products: productsReducer,
    cart: cartSlice,
    table: tableReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ---------------------------------------------------------------
// FILE: selectors.ts (optional helpers)

// ---------------------------------------------------------------
// FILE: components/ProductList.tsx (updated to use Redux)

// ---------------------------------------------------------------
// FILE: components/CartDisplayRedux.tsx

// ---------------------------------------------------------------
// USAGE NOTES
// 1) Install dependencies: `npm i @reduxjs/toolkit react-redux`
// 2) Provide the store in your app root (e.g., app/providers or _app.tsx):
//
//    import { Provider } from 'react-redux';
//    import { store } from './store'; <Provider store={store}>{children}</Provider>
//
//    export default function RootLayout({ children }) {
//      return (
//        <html>
//          <body>
//
//          </body>
//        </html>
//      )
//    }
//
// 3) Replace your previous ProductList and CartDisplay with ProductListRedux and CartDisplayRedux

// ---------------------------------------------------------------
// End of file
