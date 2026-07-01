import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { NewsPage } from "./pages/NewsPage";
import { AdminPage } from "./pages/AdminPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { SourceDetailPage } from "./pages/SourceDetailPage";
import { AiDebugPage } from "./pages/AiDebugPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: NewsPage },
      { path: "news", Component: NewsPage },
      { path: "admin", Component: AdminPage },
      { path: "monitoring", Component: MonitoringPage },
      { path: "debug/ai", Component: AiDebugPage },
      { path: "sources/:id", Component: SourceDetailPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
