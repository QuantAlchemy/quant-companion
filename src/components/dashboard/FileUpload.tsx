import { createSignal } from 'solid-js'
import Papa, { type ParseResult } from 'papaparse'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { TextFieldErrorMessage, TextFieldRoot } from '@/components/ui/textfield'
import {
  processTradingViewData,
  setTradeData,
  setOriginalTradeData,
  type TradingViewRecord,
} from '@/libs/stats'
import {
  currentHeaderConfig,
  validateHeaders,
  transformDataByHeaderConfig,
} from '@/config/headerMappings'

const MESSAGES = {
  PAPA_PARSE_FAILED: 'Papa Parse failed',
  MALFORMED_DATA: 'The file does not contain the expected columns',
  XLSX_PARSE_FAILED: 'Failed to parse Excel file',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
  INVALID_HEADERS: 'The file headers do not match the selected configuration',
}

export const [uploadError, setUploadError] = createSignal<string | null>(null)

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
          if (!validateHeaders(meta.fields || [], currentHeaderConfig())) {
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
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

    // Remove header row and convert to TradingViewRecord format
    const headers = rawData[0] as string[]

    // Validate headers against selected configuration
    if (!validateHeaders(headers, currentHeaderConfig())) {
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
            // Convert Excel date number to proper date string using dayjs
            value = dayjs(new Date((value - 25569) * 86400 * 1000)).format('YYYY-MM-DD HH:mm:ss')
          }
          return [header, value]
        })
      )

      // Map each header to its value using the header name
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

export const FileUpload = () => {
  const [files, setFiles] = createSignal<File[]>([])

  const handleFileUpload = async (event: Event & { target: HTMLInputElement }) => {
    const uploadedFiles = event.target.files
    if (uploadedFiles && uploadedFiles.length > 0) {
      setFiles(Array.from(uploadedFiles))
    }

    const selectedFiles = files()
    if (!selectedFiles.length) return

    setUploadError(null)

    try {
      const results = await Promise.all(
        selectedFiles.map(async (file) => {
          const data = await processFile(file)
          // Transform the data according to the selected header configuration
          const transformedData = transformDataByHeaderConfig(data, currentHeaderConfig())
          return processTradingViewData(file.name, transformedData)
        })
      )
      let mergedTrades = results.flat()
      mergedTrades.sort((a, b) => a.exitDate.getTime() - b.exitDate.getTime())
      mergedTrades = mergedTrades.map((trade, i) => ({ ...trade, tradeNo: i + 1 }))
      setTradeData(mergedTrades)
      setOriginalTradeData(mergedTrades)
    } catch (error) {
      console.error({ message: error })
      setTradeData(null)
      setUploadError(typeof error === 'string' ? error : MESSAGES.MALFORMED_DATA)
    }
  }

  return (
    <div>
      <Button
        as="label"
        class="mt-4"
        variant="default"
      >
        <input
          type="file"
          hidden
          multiple
          accept=".csv,.xlsx"
          onChange={handleFileUpload}
        />
        Upload Data
      </Button>
      <TextFieldRoot validationState={uploadError() ? 'invalid' : 'valid'}>
        <TextFieldErrorMessage>{uploadError()}</TextFieldErrorMessage>
      </TextFieldRoot>
    </div>
  )
}

export default FileUpload
