import { RouterProvider } from "react-router";
import { router } from "./routes";
import * as Tooltip from "@radix-ui/react-tooltip";

export default function App() {
  return (
    <Tooltip.Provider delayDuration={200}>
      <RouterProvider router={router} />
    </Tooltip.Provider>
  );
}