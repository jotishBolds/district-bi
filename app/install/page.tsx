export default function InstallPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Install My Application
        </h1>
        <p className="text-gray-600 mb-8">
          This page helps with PWA installation on your device.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            How to Install:
          </h2>
          <ul className="text-sm text-blue-700 space-y-2 text-left">
            <li>• Open this site in your browser</li>
            <li>• Look for &quot;Add to Home Screen&quot; prompt</li>
            <li>• Tap &quot;Install&quot; when prompted</li>
            <li>• Access the app from your home screen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
