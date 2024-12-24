import { createSignal } from 'solid-js'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { TextFieldErrorMessage, TextFieldRoot } from '@/components/ui/textfield'
import { processTradingViewData, setTradeData, setOriginalTradeData } from '@/libs/stats'

import type { ParseResult } from 'papaparse'
import type { TradingViewRecord } from '@/libs/stats'

const MESSAGES = {
  PAPA_PARSE_FAILED: 'Papa Parse failed',
  MALFORMED_DATA: 'The CSV does not contain the expected columns',
}

export const [uploadError, setUploadError] = createSignal<string | null>(null)

const processFile = (file: File): Promise<TradingViewRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (csv: ParseResult<TradingViewRecord>) {
        const { data, errors } = csv
        if (errors.length) {
          reject(
            `${file.name} - ${MESSAGES.PAPA_PARSE_FAILED} - ${errors[0].message} - row ${errors[0].row}`
          )
        } else {
          resolve(data)
        }
      },
      error: (err) => reject(err.message),
    })
  })
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
          return processTradingViewData(file.name, data)
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
          accept=".csv"
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
