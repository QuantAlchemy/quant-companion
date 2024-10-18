import { createSignal } from 'solid-js'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { TextFieldErrorMessage, TextFieldRoot } from '@/components/ui/textfield'
import { processTradingViewData, setTradeData, setOriginalTradeData } from '@/libs/stats'

import type { ParseResult } from 'papaparse'
import type { TradingViewRecord } from '@/libs/stats'

const MESSAGES = {
  PAPA_PARSE_FAILED: 'Papa Parse failed',
}

export const [uploadError, setUploadError] = createSignal<string | null>(null)

export const FileUpload = () => {
  const [file, setFile] = createSignal<File | null>(null)

  const handleFileUpload = (event: Event & { target: HTMLInputElement }) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0])
    }

    const selectedFile = file()
    if (!selectedFile) return

    Papa.parse(selectedFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (csv: ParseResult<TradingViewRecord>) {
        // console.log(csv)
        const { data, errors } = csv

        setUploadError(null)

        if (errors.length) {
          const message = `${MESSAGES.PAPA_PARSE_FAILED} - ${errors[0].message} - row ${errors[0].row}`
          console.error({ errors, message })
          setTradeData(null)
          setUploadError(message)
          return
        }

        const mergedTrades = processTradingViewData(data)
        // console.log(data[0])
        // console.log(mergedTrades[0], mergedTrades[mergedTrades.length - 1])
        setTradeData(mergedTrades)
        setOriginalTradeData(mergedTrades)
      },
    })
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
