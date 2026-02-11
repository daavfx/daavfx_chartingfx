# 📊 Data Import Guide

Charting FX supports multiple data formats for maximum flexibility. This guide explains all supported formats and how to import them.

## 🎯 Supported Formats

### 1. CSV (Comma-Separated Values)
The most common format. We support various CSV variants:

#### Standard CSV Format
```csv
time,open,high,low,close,volume
1704067200,1.08500,1.08650,1.08450,1.08600,1250
1704153600,1.08600,1.08750,1.08550,1.08700,1320
```

**Columns:**
- `time`: Unix timestamp (seconds) or datetime string
- `open`: Opening price
- `high`: Highest price
- `low`: Lowest price
- `close`: Closing price
- `volume`: Trading volume (optional)

#### TradingView Export Format
```csv
time,open,high,low,close,volume
2024-01-01 00:00:00,1.08500,1.08650,1.08450,1.08600,1250
2024-01-02 00:00:00,1.08600,1.08750,1.08550,1.08700,1320
```

TradingView uses datetime strings instead of timestamps.

#### MetaTrader Export Format
```csv
Date,Time,Open,High,Low,Close,Volume
2024.01.01,00:00,1.08500,1.08650,1.08450,1.08600,1250
2024.01.02,00:00,1.08600,1.08750,1.08550,1.08700,1320
```

#### Yahoo Finance Format
```csv
Date,Open,High,Low,Close,Adj Close,Volume
2024-01-01,1.08500,1.08650,1.08450,1.08600,1.08600,1250
2024-01-02,1.08600,1.08750,1.08550,1.08700,1.08700,1320
```

Note: Yahoo includes an "Adj Close" column which we skip.

#### Custom Delimiter
You can use semicolons (`;`) or tabs (\t) instead of commas:
```csv
time;open;high;low;close;volume
1704067200;1.08500;1.08650;1.08450;1.08600;1250
```

### 2. JSON Format
```json
[
  {
    "time": "2024-01-01",
    "open": "1.08500",
    "high": "1.08650",
    "low": "1.08450",
    "close": "1.08600",
    "volume": "1250"
  },
  {
    "time": "2024-01-02",
    "open": "1.08600",
    "high": "1.08750",
    "low": "1.08550",
    "close": "1.08700",
    "volume": "1320"
  }
]
```

**Field Names:**
We accept various aliases:
- `time`, `timestamp`, `date`, `datetime`
- `open`, `o`
- `high`, `h`
- `low`, `l`
- `close`, `c`
- `volume`, `vol`, `v` (optional)

### 3. Date/Time Formats

The system auto-detects many date formats:

**Unix Timestamp:**
- `1704067200` (seconds)
- `1704067200000` (milliseconds - auto-converted)

**ISO Date:**
- `2024-01-01`
- `2024-01-01 00:00:00`
- `2024-01-01T00:00:00Z`

**Regional Formats:**
- `01/01/2024` (DD/MM/YYYY)
- `01/01/2024 00:00:00`

**Compact Format:**
- `20240101`
- `20240101 000000`

## 📥 How to Import

### Method 1: Drag & Drop
1. Open Charting FX
2. Drag your CSV/JSON file onto the chart
3. The import dialog will appear
4. Verify the detected format
5. Click "Import"

### Method 2: File Menu
1. Click `File` → `Import Data`
2. Select your file
3. Configure import settings:
   - Symbol name (e.g., "EURUSD", "XAUUSD")
   - Timeframe (M1, M5, H1, D1, etc.)
   - Format (or use Auto-Detect)
   - Delimiter (if CSV)
4. Preview the data
5. Click "Import"

### Method 3: Keyboard Shortcut
- Press `Ctrl+I` (Windows) or `Cmd+I` (Mac)
- Select file and configure

## 🔧 Import Settings

### Symbol Name
Choose a name for your data:
- Forex: `EURUSD`, `GBPUSD`, `USDJPY`
- Metals: `XAUUSD` (Gold), `XAGUSD` (Silver)
- Crypto: `BTCUSD`, `ETHUSD`
- Custom: Any name you prefer

### Timeframe
Select the candle timeframe:
- `M1` - 1 minute
- `M5` - 5 minutes
- `M15` - 15 minutes
- `M30` - 30 minutes
- `H1` - 1 hour
- `H4` - 4 hours
- `D1` - Daily
- `W1` - Weekly
- `MN1` - Monthly

### Column Mapping
If your CSV has columns in different order:
```
Column 0: time
Column 1: open
Column 2: high
Column 3: low
Column 4: close
Column 5: volume (optional)
```

You can remap these in the import dialog.

## ✅ Data Validation

The system validates your data during import:

### Automatic Checks
- ✅ **Price Logic**: High ≥ Open, Close, Low
- ✅ **Price Logic**: Low ≤ Open, Close, High
- ✅ **Time Sequence**: Candles in chronological order
- ✅ **Missing Values**: Detects and reports gaps
- ✅ **Format Detection**: Auto-detects file format

### Warnings
You may see warnings for:
- ⚠️ Missing volume data (will be set to 0)
- ⚠️ Out-of-order timestamps (will be sorted)
- ⚠️ Invalid price relationships (flagged but imported)
- ⚠️ Empty rows (skipped)

## 📦 Sample Data

We provide sample files in the `sample_data/` folder:

1. **EURUSD_D1_standard.csv** - Standard format with timestamps
2. **XAUUSD_D1_datetime.csv** - Datetime string format
3. **sample.json** - JSON format example

## 🌐 Live Data Sources

### Connecting to Live Feeds

For live trading data, you can:

1. **MT4/MT5 Integration** (Coming Soon)
   - Export data from MetaTrader
   - Auto-sync with Charting FX

2. **Broker APIs** (Coming Soon)
   - Connect directly to your broker
   - Real-time tick data

3. **Data Providers**
   - TradingView (export CSV)
   - Yahoo Finance (export CSV)
   - Dukascopy (export CSV)
   - Your broker's platform

### Manual Export from TradingView

1. Open TradingView chart
2. Click the ⬇️ export button
3. Select "Export to CSV"
4. Choose timeframe
5. Save file
6. Import into Charting FX

### Manual Export from MetaTrader

1. Open MT4/MT5
2. Go to `Tools` → `History Center`
3. Select your symbol and timeframe
4. Click `Export`
5. Save as CSV
6. Import into Charting FX

## 🚀 Pro Tips

### 1. Large Files
For files with 100,000+ candles:
- Use the data window feature
- Only visible candles are rendered
- Full dataset stays in memory for navigation

### 2. Multiple Timeframes
Import the same data in multiple timeframes:
- Import M1 for detailed analysis
- Import H1/D1 for overview
- Switch instantly between timeframes

### 3. Data Backup
Your imported data is stored in:
```
Windows: %APPDATA%\ChartingDAAVFX\
Mac: ~/Library/Application Support/ChartingDAAVFX/
Linux: ~/.local/share/ChartingDAAVFX/
```

### 4. Export Your Data
You can export your data anytime:
1. Right-click on chart
2. Select `Export Data`
3. Choose format (CSV/JSON)
4. Save to file

## ❓ Troubleshooting

### "Cannot parse time"
- Check your date format
- Try converting to Unix timestamp
- Use ISO format: `2024-01-01 00:00:00`

### "Invalid price"
- Check for typos in price values
- Ensure decimal separator is `.` not `,`
- Check column mapping

### "Empty file"
- Verify file isn't empty
- Check file encoding (UTF-8 recommended)
- Ensure file isn't corrupted

### "Format not detected"
- Manually select format in import dialog
- Check file extension (.csv, .json)
- Verify file isn't password protected

## 📞 Support

Having issues? Check:
1. This guide for format examples
2. Sample files in `sample_data/` folder
3. Import preview before confirming

---

**Happy Trading! 📈**