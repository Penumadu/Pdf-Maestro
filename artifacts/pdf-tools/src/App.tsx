import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Merge from "@/pages/Merge";
import Split from "@/pages/Split";
import Edit from "@/pages/Edit";
import Compress from "@/pages/Compress";
import Rotate from "@/pages/Rotate";
import Extract from "@/pages/Extract";
import PdfToImages from "@/pages/PdfToImages";
import ImagesToPdf from "@/pages/ImagesToPdf";
import ImageCompress from "@/pages/ImageCompress";
import ImageResize from "@/pages/ImageResize";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/merge" component={Merge} />
      <Route path="/split" component={Split} />
      <Route path="/edit" component={Edit} />
      <Route path="/compress" component={Compress} />
      <Route path="/rotate" component={Rotate} />
      <Route path="/extract" component={Extract} />
      <Route path="/pdf-to-images" component={PdfToImages} />
      <Route path="/images-to-pdf" component={ImagesToPdf} />
      <Route path="/image-compress" component={ImageCompress} />
      <Route path="/image-resize" component={ImageResize} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
