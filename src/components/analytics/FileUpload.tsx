import dayjs from 'dayjs'
import Papa from 'papaparse'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { award } from '@/lib/gamification'
import {
  currentHeaderConfigStore,
  transformDataByHeaderConfig,
  validateHeaders,
} from '@/lib/headerMappings'
import {
  originalTradeDataStore,
  processTradingViewData,
  tradeDataStore,
} from '@/lib/stats'

import type { ParseResult } from 'papaparse'
import type { TradingViewRecord } from '@/lib/stats'

const MESSAGES = {
  PAPA_PARSE_FAILED: 'Papa Parse failed',
  MALFORMED_DATA: 'The file does not contain the expected columns',
  XLSX_PARSE_FAILED: 'Failed to parse Excel file',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
  INVALID_HEADERS: 'The file headers do not match the selected configuration',
}

const processCSVFile = (file: File): Promise<TradingViewRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (csv: ParseResult<TradingViewRecord>) {
        const { data, errors, meta } = csv
        if (errors.length) {
          reject(
            `${file.name} - ${MESSAGES.PAPA_PARSE_FAILED} - ${errors[0].message} - row ${errors[0].row}`
          )
        } else {
          // Validate headers against selected configuration
          if (!validateHeaders(meta.fields || [], currentHeaderConfigStore.state)) {
            reject(MESSAGES.INVALID_HEADERS)
            return
          }
          resolve(data)
        }
      },
      error: (err) => reject(err.message),
    })
  })
}

const processXLSXFile = async (file: File): Promise<TradingViewRecord[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Find the 'List of trades' sheet
    const sheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes('list of trades')
    )
    if (!sheetName) {
      throw new Error('Could not find "List of trades" sheet')
    }

    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })

    // Remove header row and convert to TradingViewRecord format
    const headers = rawData[0] as string[]

    // Validate headers against selected configuration
    if (!validateHeaders(headers, currentHeaderConfigStore.state)) {
      throw new Error(MESSAGES.INVALID_HEADERS)
    }

    return rawData.slice(1).map((row) => {
      const record: TradingViewRecord = {} as TradingViewRecord
      // Create a map of header names to their values
      const rowMap = new Map(
        headers.map((header, index) => {
          let value = row[index]
          // Convert Excel date numbers to proper date strings
          if (header === 'Date/Time' && typeof value === 'number') {
            value = dayjs(new Date((value - 25569) * 86400 * 1000)).format(
              'YYYY-MM-DD HH:mm:ss'
            )
          }
          return [header, value]
        })
      )

      headers.forEach((header) => {
        const value = rowMap.get(header)
        record[header] = value as string | number
      })
      return record
    })
  } catch (error) {
    throw new Error(
      `${file.name} - ${MESSAGES.XLSX_PARSE_FAILED} - ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

const processFile = async (file: File): Promise<TradingViewRecord[]> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()

  switch (fileExtension) {
    case 'csv':
      return processCSVFile(file)
    case 'xlsx':
      return processXLSXFile(file)
    default:
      throw new Error(`${MESSAGES.UNSUPPORTED_FILE_TYPE}: ${fileExtension}`)
  }
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return
    const selectedFiles = Array.from(uploadedFiles)

    setUploadError(null)

    try {
      const results = await Promise.all(
        selectedFiles.map(async (file) => {
          const data = await processFile(file)
          // Transform the data according to the selected header configuration
          const transformedData = transformDataByHeaderConfig(
            data,
            currentHeaderConfigStore.state
          )
          return processTradingViewData(file.name, transformedData)
        })
      )
      let mergedTrades = results.flat()
      mergedTrades.sort((a, b) => a.exitDate.getTime() - b.exitDate.getTime())
      mergedTrades = mergedTrades.map((trade, i) => ({ ...trade, tradeNo: i + 1 }))
      tradeDataStore.setState(() => mergedTrades)
      originalTradeDataStore.setState(() => mergedTrades)
      award('csv-uploaded')
    } catch (error) {
      console.error({ message: error })
      tradeDataStore.setState(() => null)
      setUploadError(typeof error === 'string' ? error : MESSAGES.MALFORMED_DATA)
    } finally {
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
        onChange={handleFileUpload}
      />
      <Button className="mt-4" onClick={() => inputRef.current?.click()}>
        <Upload className="mr-1.5 h-4 w-4" />
        Upload Data
      </Button>
      {uploadError && (
        <p className="mt-2 text-sm text-destructive-foreground">{uploadError}</p>
      )}
    </div>
  )
}

export default FileUpload
