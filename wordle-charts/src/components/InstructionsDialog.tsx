import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface InstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstructionsDialog = ({ open, onOpenChange }: InstructionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Data Fetcher Instructions (Desktop only)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Tabs defaultValue="chrome">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chrome">Chrome</TabsTrigger>
              <TabsTrigger value="firefox">Firefox</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chrome">
              <ol className="list-decimal list-inside space-y-2">
                <li>The data fetcher script was copied to your clipboard.</li>
                <li>Open a tab with <span className="font-bold">nyt.com</span> (you must be logged in)</li>
                <li>Click in the URL bar <span className="text-gray-500">(or press Ctrl/Cmd + L)</span></li>
                <li>Paste the copied code</li>
                <li>Remove the 'a' from the beginning <span className="text-gray-500">(press HOME key, then delete)</span></li>
                <li>Press Enter</li>
              </ol>
            </TabsContent>

            <TabsContent value="firefox">
              <ol className="list-decimal list-inside space-y-2">
                <li>The data fetcher script was copied to your clipboard.</li>
                <li>Right-click your bookmarks bar and select "Add Bookmark"</li>
                <li>Paste the copied code into the "URL" field</li>
                <li>Remove the 'a' from the beginning of the pasted code</li>
                <li>Save the bookmark</li>
                <li>Open a tab with <span className="font-bold">nyt.com</span> (you must be logged in)</li>
                <li>Click the bookmark you just created</li>
              </ol>
            </TabsContent>
          </Tabs>

          <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
            <p>The data will take about 10 seconds to gather. You can watch the progress in the browser's console (F12).</p>
            <p className="mt-2">Once complete, a .json file will download — upload that file here to see your personal data.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
