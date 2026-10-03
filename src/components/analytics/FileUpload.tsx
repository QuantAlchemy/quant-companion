import Papa from 'papaparse'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { award } from '@/lib/gamification'
import {
  currentHeaderConfigStore,
  TARGET_HEADERS,
  transformDataByHeaderConfig,
  validateHeaders,
} from '@/lib/headerMappings'
import { processTradingViewData, setOriginalTradeData } from '@/lib/stats'

import type { ParseResult } from 'papaparse'
import type { TradingViewRecord } from '@/lib/stats'
import type { HeaderConfig } from '@/lib/headerMappings'

const MESSAGES = {
  PAPA_PARSE_FAILED: 'Papa Parse failed',
  MALFORMED_DATA: 'The file does not contain the expected columns',
  XLSX_PARSE_FAILED: 'Failed to parse Excel file',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
  INVALID_HEADERS: 'The file headers do not match the selected configuration',
}

const processCSVFile = (
  file: File,
  config: HeaderConfig,
): Promise<TradingViewRecord[]> => {
  const dateHeaders = config.mappings
    .filter((mapping) => mapping.targetHeader === TARGET_HEADERS.DATE_TIME)
    .flatMap((mapping) => [
      mapping.sourceHeader,
      ...(mapping.alternatives ?? []),
    ])
    .map((header) => header.trim())
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      // Keep ISO dates as strings instead of Papa Parse's automatic Date objects.
      dynamicTyping: (field) => !dateHeaders.includes(String(field).trim()),
      skipEmptyLines: true,
      complete: function (csv: ParseResult<TradingViewRecord>) {
        const { data, errors, meta } = csv
        if (errors.length) {
          reject(
            `${file.name} - ${MESSAGES.PAPA_PARSE_FAILED} - ${errors[0].message} - row ${errors[0].row}`,
          )
        } else {
          // Validate headers against selected configuration
          if (!validateHeaders(meta.fields || [], config)) {
            reject(MESSAGES.INVALID_HEADERS)
            return
          }
          resolve(transformDataByHeaderConfig(data, config))
        }
      },
      error: (err) => reject(err.message),
    })
  })
}

const processXLSXFile = async (
  file: File,
  config: HeaderConfig,
): Promise<TradingViewRecord[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Find the 'List of trades' sheet
    const sheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes('list of trades'),
    )
    if (!sheetName) {
      throw new Error('Could not find "List of trades" sheet')
    }

    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
    })

    // Remove header row and convert to TradingViewRecord format
    const headers = rawData.at(0)

    // Validate headers against selected configuration
    if (
      !headers ||
      !headers.every(
        (header): header is string => typeof header === 'string',
      ) ||
      !validateHeaders(headers, config)
    ) {
      throw new Error(MESSAGES.INVALID_HEADERS)
    }

    const records = XLSX.utils.sheet_to_json<TradingViewRecord>(worksheet, {
      defval: '',
    })
    return transformDataByHeaderConfig(records, config).map((record) => {
      const value = record[TARGET_HEADERS.DATE_TIME]
      // Excel stores wall-clock time. Format it without shifting to the browser's timezone.
      if (typeof value === 'number') {
        record[TARGET_HEADERS.DATE_TIME] = XLSX.utils.format_cell({
          t: 'n',
          v: value + (workbook.Workbook?.WBProps?.date1904 ? 1462 : 0),
          z: 'yyyy-mm-dd hh:mm:ss.000',
        })
      }
      return record
    })
  } catch (error) {
    throw new Error(
      `${file.name} - ${MESSAGES.XLSX_PARSE_FAILED} - ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

const processFile = async (
  file: File,
  config: HeaderConfig,
): Promise<TradingViewRecord[]> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()

  switch (fileExtension) {
    case 'csv':
      return processCSVFile(file, config)
    case 'xlsx':
      return processXLSXFile(file, config)
    default:
      throw new Error(`${MESSAGES.UNSUPPORTED_FILE_TYPE}: ${fileExtension}`)
  }
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadInProgress = useRef(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const uploadedFiles = event.target.files
    if (
      !uploadedFiles ||
      uploadedFiles.length === 0 ||
      uploadInProgress.current
    )
      return
    const selectedFiles = Array.from(uploadedFiles)
    const config = currentHeaderConfigStore.state

    uploadInProgress.current = true
    setIsUploading(true)
    setUploadError(null)
    setUploadNotice(null)

    try {
      const results = await Promise.all(
        selectedFiles.map(async (file) => {
          const data = await processFile(file, config)
          return processTradingViewData(file.name, data)
        }),
      )
      let mergedTrades = results.flatMap((result) => result.trades)
      const excludedCount = results.reduce(
        (count, result) => count + result.excludedOpenTrades.length,
        0,
      )
      const notice =
        excludedCount > 0
          ? `Excluded ${excludedCount} open ${excludedCount === 1 ? 'trade' : 'trades'} without an Exit row.`
          : null
      if (mergedTrades.length === 0) {
        throw new Error(
          `No completed trades found. ${notice ?? 'Export a list with Entry and Exit rows.'}`,
        )
      }
      mergedTrades.sort((a, b) => a.exitDate.getTime() - b.exitDate.getTime())
      mergedTrades = mergedTrades.map((trade, i) => ({
        ...trade,
        tradeNo: i + 1,
      }))
      setOriginalTradeData(mergedTrades)
      setUploadNotice(notice)
      award('csv-uploaded')
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : MESSAGES.MALFORMED_DATA,
      )
    } finally {
      uploadInProgress.current = false
      setIsUploading(false)
      // allow re-uploading the same file
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept=".csv,.xlsx"
        disabled={isUploading}
        onChange={handleFileUpload}
      />
      <Button
        className="mt-4"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-1.5 h-4 w-4" />
        Upload Data
      </Button>
      {uploadError && (
        <p role="alert" className="mt-2 text-sm text-destructive-foreground">
          {uploadError}
        </p>
      )}
      {uploadNotice && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {uploadNotice}
        </p>
      )}
    </div>
  )
}

export default FileUpload
