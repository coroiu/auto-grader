# Auto Grader

A photography workflow automation tool that watches for RAW files, converts them, and applies multiple LUT grades automatically.

## Features

- **Automatic file watching**: Monitors `/data/inbox` for new Sony ARW (RAW) files
- **RAW conversion**: Uses darktable-cli to convert RAW to TIFF
- **LUT grading**: Applies all `.cube` LUTs from `/data/luts` using FFmpeg
- **Gallery UI**: Browse and compare graded outputs side-by-side
- **Filesystem-based state**: No database required; state derived from file existence

## Architecture

```
[FTP Upload] → [/data/inbox] → [File Watcher] → [Processing Queue]
                                                        ↓
                               [darktable-cli: ARW → TIFF]
                                                        ↓
                               [FFmpeg: TIFF + LUTs → JPGs]
                                                        ↓
[Gallery UI] ← [Next.js API] ← [Filesystem] ← [/data/output]
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) Node.js 20+ for local development

### Running with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/auto-grader.git
cd auto-grader

# Create data directories
mkdir -p data/{inbox,output,luts}

# Add some LUT files
cp your-luts/*.cube data/luts/

# Start the application
docker-compose up -d

# Open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Usage

1. **Add LUTs**: Place `.cube` files in `/data/luts/`
2. **Upload photos**: Drop ARW files in `/data/inbox/` (via FTP or manually)
3. **Wait for processing**: Files are automatically converted and graded
4. **Browse gallery**: Open http://localhost:3000 to view and compare results

## Directory Structure

```
/data/
├── inbox/          # RAW files arrive here
├── output/         # Processed outputs (organized by photo)
│   └── DSC00123/   # Folder named after RAW file
│       ├── .processing     # Marker: processing in progress
│       ├── metadata.json   # Cached EXIF data
│       ├── thumb.jpg       # Gallery thumbnail
│       ├── original.jpg    # No LUT applied
│       ├── cinematic.jpg   # Named after LUT file
│       └── vintage.jpg     # Named after LUT file
└── luts/           # .cube LUT files
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `/data` | Base directory for data volumes |
| `CONCURRENCY` | `2` | Number of parallel processing jobs |
| `JPG_QUALITY` | `95` | JPEG output quality (1-100) |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **RAW Processing**: darktable-cli
- **LUT Application**: FFmpeg (lut3d filter)
- **File Watching**: chokidar
- **Job Queue**: p-queue
- **Container**: Docker

## Development

```bash
# Run linter
npm run lint

# Type check
npm run type-check

# Build for production
npm run build
```

## License

MIT
