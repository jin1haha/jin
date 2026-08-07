# Running JIN as a real app via Termux

This makes JIN open as a standalone app (no address bar, no "site" feel),
keeps working with zero connection, and keeps the background server alive
so it survives reboots and Android's battery cleanup.

## 1. Install Termux + Termux:Boot (F-Droid, not Play Store)

The Play Store version of Termux is discontinued and can't install packages
anymore. Get both from F-Droid:
- https://f-droid.org/packages/com.termux/
- https://f-droid.org/packages/com.termux.boot/

## 2. One-time setup, inside Termux

```
termux-setup-storage
pkg install python termux-api termux-services -y
```

Copy (or re-download) the `mysched` folder into Termux's home directory,
so the path is `~/mysched`. If you unzipped it on your phone's normal
Downloads folder, move it in with:

```
cp -r /sdcard/Download/mysched ~/mysched
cd ~/mysched/termux
chmod +x start.sh boot-start-jin.sh
```

## 3. Start the server and lock the app open

```
./start.sh
```

Leave this Termux session running in the background (swipe it away from
recent apps but don't force-stop it — Android keeps background terminal
sessions alive as a foreground service while `termux-wake-lock` is held).

## 4. Auto-start on every reboot (optional but recommended)

```
mkdir -p ~/.termux/boot
cp boot-start-jin.sh ~/.termux/boot/
chmod +x ~/.termux/boot/boot-start-jin.sh
```

Now the server comes back up automatically after any phone restart —
you never have to manually reopen Termux.

## 5. Stop Android from killing Termux in the background

Go to Android Settings → Apps → Termux → Battery →
set to **Unrestricted** (or "No battery optimization"). Do the same for
"Termux:Boot" if it's listed. This is the actual fix for Termux "dying" —
it's Android's battery manager pausing it, not a bug in the script.

## 6. Install JIN as a real app (not a browser tab)

1. Open Chrome and go to `http://127.0.0.1:8080`
2. Tap the **⋮** menu → **Install app** (this option only shows up because
   the server makes it a proper secure context — plain `file://` links
   never get this option, which is why it looked like "just a website"
   before).
3. Confirm. JIN now has its own icon, opens full-screen with no address
   bar, and shows up in your app switcher like any other app.

## Good to know: it still works if Termux is closed

Once installed, JIN's service worker caches everything it needs. If
Termux gets closed or the phone is fully offline, the app still opens —
it just won't be able to pull in an *update* until the server's reachable
again. Keeping Termux alive (steps 3–5) is only needed for updates and
for you to be able to edit the schedule files directly on-device.
