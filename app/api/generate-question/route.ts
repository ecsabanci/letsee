import { NextResponse } from 'next/server'

// dbmdz/bert-base-turkish-cased modelini kullanalım
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/facebook/mbart-large-50-many-to-many-mmt"
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY

type QuestionCategory = 
  | "Genel Kültür"
  | "Tarih"
  | "Bilim"
  | "Teknoloji"
  | "Sanat"
  | "Spor"
  | "Coğrafya"
  | "Eğlence"
  | "Yemek ve Mutfak"
  | "Film ve Dizi"

export async function POST(request: Request) {
  try {
    const { category } = await request.json()

    const prompt = `Aşağıdaki talimatları takip ederek bir soru üret:
    1. Kategori: ${category}
    2. Soru eğlenceli ve düşündürücü olmalı
    3. Soru Türkçe olmalı
    4. Sadece soruyu yaz, cevabını yazma
    5. Soru en fazla 2-3 cümle olmalı
    6. Açık uçlu bir soru olmalı, herkesin farklı cevap verebileceği türden
    7. Evet/hayır sorusu olmamalı
    
    Soru:`

    const response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.8,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false
        }
      })
    })

    const result = await response.json()
    let question = result[0]?.generated_text || ""

    // Prompt'u ve gereksiz metinleri temizle
    question = question
      .replace(prompt, "")
      .replace("Soru:", "")
      .replace("Cevap:", "")
      .split("Cevap")[0] // Eğer cevap varsa, cevaptan önceki kısmı al
      .trim()

    // Eğer soru boşsa veya çok kısaysa
    if (!question || question.length < 10) {
      // Yedek sorular
      const backupQuestions: Record<QuestionCategory, string> = {
        "Genel Kültür": "Sizce dünyada değiştirilmesi gereken en önemli şey nedir ve neden?",
        "Tarih": "Tarihte hangi döneme gidip orada bir gün geçirmek isterdiniz ve ne yapardınız?",
        "Bilim": "Gelecekte icat edilmesini istediğiniz teknolojik alet nedir ve ne işe yarayacak?",
        "Teknoloji": "Sosyal medya hiç olmasaydı hayatımız nasıl değişirdi?",
        "Sanat": "Sizi en çok etkileyen sanat eseri hangisidir ve neden?",
        "Spor": "Yeni bir spor dalı icat etseydiniz kuralları nasıl olurdu?",
        "Coğrafya": "Dünyada yaşamak istediğiniz ideal şehri tarif eder misiniz?",
        "Eğlence": "Hayatınızın filmi çekilse en komik sahne ne olurdu?",
        "Yemek ve Mutfak": "Tüm yemeklerin sağlıklı olduğu bir dünyada en çok hangi yemeği yemek isterdiniz?",
        "Film ve Dizi": "Favori film karakterinizle bir gün geçirme şansınız olsa neler yapardınız?"
      }
      question = backupQuestions[category as QuestionCategory] || backupQuestions["Genel Kültür"]
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Soru üretme hatası:', error)
    return NextResponse.json(
      { error: 'Soru üretilirken bir hata oluştu' },
      { status: 500 }
    )
  }
} 