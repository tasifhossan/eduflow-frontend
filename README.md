# 💻 EduFlow — Frontend Web Application  
Next.js 16 Web Application for EduFlow Platform.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Dependencies](#dependencies)
- [Installation️ & Setup](#installation--setup)
- [Folder Structure](#folder-structure)
- [Contributions](#contributions)
- [How to Contribute](#how-to-contribute)
- [License](#license)
- [Contact](#contact)

---

## About the Project 
The EduFlow Frontend application provides a responsive portal for Students, Teachers, and Admins to access routines, take digital exams, view leaderboards, and manage coaching branch operations.

---

## Project Overview  
Built with Next.js 16 App Router and Tailwind CSS v4 to deliver fast performance, smooth UI animations, dark mode capabilities, and interactive assessment components.

---

## Key Features  
- **Interactive Exam Portal** — Full-screen timed online MCQ & written exam test taker.
- **Admin & Teacher Dashboards** — Batch creation, routine viewer, attendance logging, and paper test leaderboard entry.
- **Student Analytics** — Visual test history, marks summary, and attendance records.

---

## Tech Stack  
**Frontend:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript  
**Tools:** Git · VS Code · Lucide React

---

## Dependencies  

```json
{
  "next": "16.2.11",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "lucide-react": "^1.26.0",
  "tailwindcss": "^4"
}
```

---

## Installation️ & Setup
1. Install dependencies:

```bash
cd frontend
npm install
```

2. Set up environment variables in `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Run the development application:

```bash
npm run dev
```

---

## Folder Structure

```plaintext
frontend/
├── app/
│   ├── (auth)/
│   ├── dashboard/
│   └── page.tsx
├── components/
├── lib/
└── package.json
```

---

## Contributions
Developed by Tasif Hossan.

| Name            | Role                | Contributions                            |  
|-----------------|---------------------|------------------------------------------|  
| Tasif Hossan    | Lead Developer      | Frontend UI/UX & Next.js App Router      |  

---

## How to Contribute

- Fork the Project
- Create a branch (`git checkout -b feature/AmazingFeature`)
- Commit changes (`git commit -m 'Add some AmazingFeature'`)
- Push the branch (`git push origin feature/AmazingFeature`)
- Open a Pull Request

---

## License
Distributed under the MIT License. See `LICENSE` for more information.

---

## Contact

**Portfolio:** [Tasif Hossan](https://tasif-portfolio.vercel.app/)  
**LinkedIn:** [Tasif Hossan](https://www.linkedin.com/in/tasifhossan/)  
**GitHub:** [@tasifhossan](https://github.com/tasifhossan)
