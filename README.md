# Desktop Widgets GNOME Extension

A powerful, modular widget system for your desktop. Place and customize various widgets on your background to enhance your workspace.

This extension decouples widgets from the shell interface, allowing for infinite customization of clocks, and more, all rendered natively on your desktop wallpaper.

## Features

*   **Modular System:**
    *   Easily enable or disable specific widgets based on your needs.
*   **Native Integration:**
    *   Widgets are rendered directly on the desktop background, feeling like a natural part of your OS.
*   **Available Plugins:**
    *   **Date & Time:** A highly customizable clock and date display.
    *   **Custom Text:** Display static or dynamic text on your desktop.

## Compatibility

Requires GNOME Shell version 46 and up.

## Installation

### From extensions.gnome.org (Recommended)

The easiest way to install is from the official GNOME Extensions website.

<a href="https://extensions.gnome.org/extension/9071/desktop-widgets/">
<img src="https://github.com/andyholmes/gnome-shell-extensions-badge/raw/master/get-it-on-ego.svg" alt="Get it on EGO" width="200" />
</a>

### Installing from a ZIP File

1.  **Download the ZIP:** Go to the [Releases](https://github.com/NiffirgkcaJ/desktop-widgets/releases) page and download the latest `desktop-widgets@NiffirgkcaJ.github.com.zip` file.

2.  **Unzip the File:** Extract the contents of the zip file. This will create a folder with the extension's files inside (like `extension.js`, `metadata.json`, etc.).

3.  **Find the Destination Folder:** The extension needs to be placed in your local extensions directory. You can open it in your file manager or create it if it doesn't exist with this command:
    ```bash
    mkdir -p ~/.local/share/gnome-shell/extensions/
    ```

4.  **Move and Rename:** Move the unzipped folder into the extensions directory and **rename the folder to match the extension's UUID**. This step is crucial. The UUID is: `desktop-widgets@NiffirgkcaJ.github.com`.

    For example, if you unzipped the files into a folder named `desktop-widgets`, you would run:
    ```bash
    mv desktop-widgets ~/.local/share/gnome-shell/extensions/desktop-widgets@NiffirgkcaJ.github.com
    ```

5.  **Restart GNOME Shell:**
    *   **X11:** Press `Alt` + `F2`, type `r`, and press `Enter`.
    *   **Wayland:** Log out and log back in.

6.  **Enable the Extension:** Open the **Extensions** app (or GNOME Tweaks) and enable "Desktop Widgets". You can also do this from the command line:
    ```bash
    gnome-extensions enable desktop-widgets@NiffirgkcaJ.github.com
    ```

### Install from Source (for Developers)

1.  Clone the repository:
    ```bash
    git clone https://github.com/NiffirgkcaJ/desktop-widgets.git
    cd desktop-widgets
    ```
2.  Run the installation script:
    ```bash
    ./install.sh
    ```
3.  Restart GNOME Shell (press `Alt` + `F2`, type `r`, and press `Enter`) or log out and back in.
4.  Enable the extension using the Extensions app or the command line:
    ```bash
    gnome-extensions enable desktop-widgets@NiffirgkcaJ.github.com
    ```

## Usage

*   **Open Settings:** Open the Extension Preferences via the Extensions app or run `gnome-extensions prefs desktop-widgets@NiffirgkcaJ.github.com`.
*   **Manage Widgets:** Use the "Widgets" tab to add, remove, and configure your desktop widgets.

## Uninstallation

*   **Using the Extensions App (Recommended):**
    Open the "Extensions" application, find "Desktop Widgets", and click the "Uninstall" button.

*   **Using the Script:**
    If you installed from source, navigate to the cloned repository directory and run:
    ```bash
    ./uninstall.sh
    ```

## Contributing

Contributions are welcome! Please feel free to open an issue to report a bug or suggest a feature, or submit a pull request with your improvements.

## License

This project is licensed under the **GPLv3** - see the [LICENSE](LICENSE) file for details.
