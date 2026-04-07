#!/usr/bin/env bash
set -euo pipefail

BINARIES_DIR="$(cd "$(dirname "$0")/.." && pwd)/src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

FFMPEG_VERSION="7.1.1"

cleanup() {
    rm -rf "$TMP_DIR"
}
TMP_DIR="$(mktemp -d)"
trap cleanup EXIT

# Windows x86_64
download_windows() {
    echo "==> Downloading ffmpeg for Windows x86_64..."
    local url="https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    local zip="$TMP_DIR/ffmpeg-windows.zip"
    curl -fsSL "$url" -o "$zip"
    local inner="$TMP_DIR/ffmpeg-windows"
    unzip -qo "$zip" -d "$inner"
    local bin_dir
    bin_dir=$(find "$inner" -name "ffmpeg.exe" -printf "%h" | head -1)
    cp "$bin_dir/ffmpeg.exe" "$BINARIES_DIR/ffmpeg-x86_64-pc-windows-msvc.exe"
    cp "$bin_dir/ffprobe.exe" "$BINARIES_DIR/ffprobe-x86_64-pc-windows-msvc.exe"
    rm -rf "$inner" "$zip"
    echo "    Done."
}

# macOS Apple Silicon (aarch64)
download_macos_arm() {
    echo "==> Downloading ffmpeg for macOS aarch64..."
    local url="https://www.osxexperts.net/ffmpeg${FFMPEG_VERSION//./}arm.zip"
    local zip="$TMP_DIR/ffmpeg-macos-arm.zip"
    curl -fsSL "$url" -o "$zip"
    local inner="$TMP_DIR/ffmpeg-macos-arm"
    unzip -qo "$zip" -d "$inner"
    local ffmpeg_bin
    ffmpeg_bin=$(find "$inner" -name "ffmpeg" -type f | head -1)
    cp "$ffmpeg_bin" "$BINARIES_DIR/ffmpeg-aarch64-apple-darwin"
    chmod +x "$BINARIES_DIR/ffmpeg-aarch64-apple-darwin"
    rm -rf "$inner" "$zip"

    echo "    Downloading ffprobe for macOS aarch64..."
    curl -fsSL "https://www.osxexperts.net/ffprobe${FFMPEG_VERSION//./}arm.zip" -o "$zip"
    unzip -qo "$zip" -d "$inner"
    local ffprobe_bin
    ffprobe_bin=$(find "$inner" -name "ffprobe" -type f | head -1)
    cp "$ffprobe_bin" "$BINARIES_DIR/ffprobe-aarch64-apple-darwin"
    chmod +x "$BINARIES_DIR/ffprobe-aarch64-apple-darwin"
    rm -rf "$inner" "$zip"
    echo "    Done."
}

# macOS Intel (x86_64)
download_macos_intel() {
    echo "==> Downloading ffmpeg for macOS x86_64..."
    local url="https://evermeet.cx/ffmpeg/getrelease/zip"
    local zip="$TMP_DIR/ffmpeg-macos-intel.zip"
    curl -fsSL "$url" -o "$zip"
    local inner="$TMP_DIR/ffmpeg-macos-intel"
    unzip -qo "$zip" -d "$inner"
    local ffmpeg_bin
    ffmpeg_bin=$(find "$inner" -name "ffmpeg" -type f | head -1)
    cp "$ffmpeg_bin" "$BINARIES_DIR/ffmpeg-x86_64-apple-darwin"
    chmod +x "$BINARIES_DIR/ffmpeg-x86_64-apple-darwin"
    rm -rf "$inner" "$zip"

    echo "    Downloading ffprobe for macOS x86_64..."
    curl -fsSL "https://evermeet.cx/ffprobe/getrelease/zip" -o "$zip"
    unzip -qo "$zip" -d "$inner"
    local ffprobe_bin
    ffprobe_bin=$(find "$inner" -name "ffprobe" -type f | head -1)
    cp "$ffprobe_bin" "$BINARIES_DIR/ffprobe-x86_64-apple-darwin"
    chmod +x "$BINARIES_DIR/ffprobe-x86_64-apple-darwin"
    rm -rf "$inner" "$zip"
    echo "    Done."
}

# Linux x86_64
download_linux() {
    echo "==> Downloading ffmpeg for Linux x86_64..."
    local url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
    local archive="$TMP_DIR/ffmpeg-linux.tar.xz"
    curl -fsSL "$url" -o "$archive"
    local inner="$TMP_DIR/ffmpeg-linux"
    mkdir -p "$inner"
    tar xf "$archive" -C "$inner"
    local bin_dir
    bin_dir=$(find "$inner" -name "ffmpeg" -printf "%h" | head -1)
    cp "$bin_dir/ffmpeg" "$BINARIES_DIR/ffmpeg-x86_64-unknown-linux-gnu"
    cp "$bin_dir/ffprobe" "$BINARIES_DIR/ffprobe-x86_64-unknown-linux-gnu"
    chmod +x "$BINARIES_DIR/ffmpeg-x86_64-unknown-linux-gnu" "$BINARIES_DIR/ffprobe-x86_64-unknown-linux-gnu"
    rm -rf "$inner" "$archive"
    echo "    Done."
}

# Download only the platform requested, or all if no argument
case "${1:-all}" in
    windows) download_windows ;;
    macos-arm) download_macos_arm ;;
    macos-intel) download_macos_intel ;;
    linux) download_linux ;;
    all)
        download_windows
        download_macos_arm
        download_macos_intel
        download_linux
        ;;
    *)
        echo "Usage: $0 [windows|macos-arm|macos-intel|linux|all]"
        exit 1
        ;;
esac

echo ""
echo "Binaries in $BINARIES_DIR:"
ls -lh "$BINARIES_DIR"
