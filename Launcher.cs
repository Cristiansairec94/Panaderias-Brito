using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace PanaderiaBrito
{
    static class Program
    {
        private const string DefaultCloudUrl = "https://panaderias-brito.vercel.app";
        private const string DefaultLocalUrl = "http://localhost:3000";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                bool forceSettings = (Control.ModifierKeys & Keys.Shift) == Keys.Shift;
                if (args != null && args.Length > 0 && (args[0].Equals("--settings", StringComparison.OrdinalIgnoreCase) || args[0].Equals("/settings", StringComparison.OrdinalIgnoreCase)))
                {
                    forceSettings = true;
                }

                string configFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "panaderia_config.txt");
                string savedUrl = null;
                if (File.Exists(configFile))
                {
                    try { savedUrl = File.ReadAllText(configFile).Trim(); } catch { }
                }

                if (forceSettings)
                {
                    string chosen = ShowSettingsDialog(savedUrl);
                    if (string.IsNullOrEmpty(chosen)) return;
                    savedUrl = chosen;
                    try { File.WriteAllText(configFile, savedUrl); } catch { }
                }

                string targetUrl = ResolveUrl(args, savedUrl);
                EnsurePrintBridgeRunning();
                LaunchAppWindow(targetUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error al iniciar Panadería Brito:\n" + ex.Message,
                    "Panadería Brito",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static string ResolveUrl(string[] args, string savedUrl)
        {
            if (args != null && args.Length > 0)
            {
                string a = args[0].Trim();
                if (a.Equals("--local", StringComparison.OrdinalIgnoreCase)) return DefaultLocalUrl;
                if (a.Equals("--cloud", StringComparison.OrdinalIgnoreCase)) return DefaultCloudUrl;
                if (a.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || a.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    return a;
            }

            if (!string.IsNullOrEmpty(savedUrl))
            {
                return savedUrl;
            }

            // If localhost:3000 is currently running, use it; otherwise open cloud
            if (IsServerAlive(DefaultLocalUrl))
            {
                return DefaultLocalUrl;
            }

            return DefaultCloudUrl;
        }

        private static bool IsServerAlive(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "GET";
                req.Timeout = 600;
                req.ReadWriteTimeout = 600;
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return (int)res.StatusCode < 400;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void EnsurePrintBridgeRunning()
        {
            try
            {
                if (!IsServerAlive("http://127.0.0.1:9191/status"))
                {
                    string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "brito-print-server.js");
                    if (!File.Exists(scriptPath))
                    {
                        scriptPath = @"c:\Users\HP\Desktop\ANTIGRAVITI\brito-print-server.js";
                    }
                    if (File.Exists(scriptPath))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo("node", "\"" + scriptPath + "\"")
                        {
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            WindowStyle = ProcessWindowStyle.Hidden,
                            WorkingDirectory = Path.GetDirectoryName(scriptPath)
                        };
                        Process.Start(psi);
                    }
                }
            }
            catch { }
        }

        private static void EnsureKioskPrintingPreferences(string profileDir)
        {
            try
            {
                string defaultDir = Path.Combine(profileDir, "Default");
                Directory.CreateDirectory(defaultDir);
                string prefFile = Path.Combine(defaultDir, "Preferences");

                string targetPrinter = "POS-58";
                try
                {
                    System.Drawing.Printing.PrinterSettings ps = new System.Drawing.Printing.PrinterSettings();
                    if (ps.IsValid && !string.IsNullOrEmpty(ps.PrinterName))
                    {
                        targetPrinter = ps.PrinterName;
                    }
                }
                catch { }

                string printerSnippet = "{\"printing\":{\"print_preview_sticky_settings\":{\"appState\":\"{\\\"version\\\":2,\\\"recentDestinations\\\":[{\\\"id\\\":\\\"" + targetPrinter + "\\\",\\\"origin\\\":\\\"local\\\",\\\"displayName\\\":\\\"" + targetPrinter + "\\\",\\\"printerStatus\\\":\\\"printerStatusReady\\\",\\\"extensionId\\\":\\\"\\\",\\\"extensionName\\\":\\\"\\\"}],\\\"dpi\\\":{},\\\"duplexType\\\":\\\"LONG_EDGE\\\",\\\"mediaSize\\\":{},\\\"marginsType\\\":1,\\\"isColorEnabled\\\":false,\\\"isHeaderFooterEnabled\\\":false,\\\"isLandscapeEnabled\\\":false,\\\"isCollateEnabled\\\":true,\\\"isCssBackgroundEnabled\\\":true,\\\"scaling\\\":\\\"100\\\",\\\"vendorOptions\\\":{}}\"}}}";
                File.WriteAllText(prefFile, printerSnippet);
            }
            catch { }
        }

        private static void LaunchAppWindow(string url)
        {
            string edge86 = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            string edge64 = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            string chrome64 = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            string chrome86 = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";

            string browser = null;
            if (File.Exists(edge86)) browser = edge86;
            else if (File.Exists(edge64)) browser = edge64;
            else if (File.Exists(chrome64)) browser = chrome64;
            else if (File.Exists(chrome86)) browser = chrome86;

            if (!string.IsNullOrEmpty(browser))
            {
                // Dedicated profile directory so POS state and local cache are isolated
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string profileDir = Path.Combine(appData, "PanaderiaBrito", "AppProfile");
                Directory.CreateDirectory(profileDir);
                EnsureKioskPrintingPreferences(profileDir);

                string arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1400,900 --start-maximized --kiosk-printing", url, profileDir);
                ProcessStartInfo psi = new ProcessStartInfo(browser, arguments)
                {
                    UseShellExecute = false
                };
                Process.Start(psi);
            }
            else
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }

        private static string ShowSettingsDialog(string currentUrl)
        {
            using (Form form = new Form())
            {
                form.Text = "Configuración - Panadería Brito";
                form.Size = new Size(460, 260);
                form.StartPosition = FormStartPosition.CenterScreen;
                form.FormBorderStyle = FormBorderStyle.FixedDialog;
                form.MaximizeBox = false;
                form.MinimizeBox = false;

                Label lbl = new Label() { Text = "Selecciona o ingresa la URL de conexión:", Top = 20, Left = 20, Width = 400 };
                
                RadioButton rbCloud = new RadioButton() { Text = "Nube / Producción (Vercel)", Top = 50, Left = 30, Width = 380 };
                RadioButton rbLocal = new RadioButton() { Text = "Servidor Local (http://localhost:3000)", Top = 75, Left = 30, Width = 380 };
                RadioButton rbCustom = new RadioButton() { Text = "Personalizada:", Top = 100, Left = 30, Width = 110 };
                
                TextBox txtCustom = new TextBox() { Top = 98, Left = 150, Width = 260, Text = currentUrl ?? DefaultCloudUrl };

                if (string.IsNullOrEmpty(currentUrl) || currentUrl == DefaultCloudUrl)
                    rbCloud.Checked = true;
                else if (currentUrl == DefaultLocalUrl)
                    rbLocal.Checked = true;
                else
                    rbCustom.Checked = true;

                Button btnOk = new Button() { Text = "Guardar y Abrir", Top = 150, Left = 120, Width = 130, DialogResult = DialogResult.OK };
                Button btnCancel = new Button() { Text = "Cancelar", Top = 150, Left = 260, Width = 100, DialogResult = DialogResult.Cancel };

                form.Controls.AddRange(new Control[] { lbl, rbCloud, rbLocal, rbCustom, txtCustom, btnOk, btnCancel });
                form.AcceptButton = btnOk;
                form.CancelButton = btnCancel;

                if (form.ShowDialog() == DialogResult.OK)
                {
                    if (rbLocal.Checked) return DefaultLocalUrl;
                    if (rbCustom.Checked && !string.IsNullOrWhiteSpace(txtCustom.Text)) return txtCustom.Text.Trim();
                    return DefaultCloudUrl;
                }
                return null;
            }
        }
    }
}
