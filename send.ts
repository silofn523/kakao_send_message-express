import express, { Request, Response } from 'express'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const REST_API_KEY = process.env.KAKAO_REST_API_KEY!
const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI!

// 카카오 OAuth 토큰 발급 URL
const TOKEN_URL = 'https://kauth.kakao.com/oauth/token'

// 카카오 메시지 전송 API URL
const MESSAGE_API_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send'

app.use(express.json())

// 카카오 로그인
app.get('/auth/kakao', (req: Request, res: Response) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}`
  res.redirect(kakaoAuthUrl)
})

// 토큰 발급
app.get('/auth/kakao/callback', async (req: Request | any, res: Response | any) => {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code is missing'
    })
  }

  try {
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: REST_API_KEY,
      redirect_uri: REDIRECT_URI,
      code: code as string
    })

    const response = await axios.post(TOKEN_URL, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const { access_token } = response.data

    res.status(200).json({
      success: true,
      message: 'Access token 발급 성공',
      access_token
    })
  } catch (err: any) {
    console.error('OAuth Error:', err.response.data)

    res.status(err.response?.status || 500).json({
      success: false,
      response: err.response?.data,
      message: err.message
    })
  }
})

// 발급받은 액세스 토큰으로 나에게 카톡 보내기
app.post('/send-message', async (req: Request | any, res: Response | any) => {
  const token = req.headers.authorization?.split(' ')[1] // Bearer 토큰 추출

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token is missing'
    })
  }

  const { text, web_url, mobile_web_url, btnTitle } = req.body

  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'text is required'
    })
  }

  try {
    const data = {
      template_object: JSON.stringify({
        object_type: 'text',
        text: text,
        link: {
          web_url: web_url,
          mobile_web_url: mobile_web_url
        },
        button_title: btnTitle
      })
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    const response = await axios.post(MESSAGE_API_URL, new URLSearchParams(data), { headers })

    res.status(200).json({
      success: true,
      data: response.data
    })
  } catch (err: any) {
    console.error('Message Error:', err.response.data)

    res.status(err.response.status).json({
      success: false,
      response: err.response.data,
      message: err.message
    })
  }
})

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
