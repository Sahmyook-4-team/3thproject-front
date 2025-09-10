'use client';

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// --- [수정 1] main/page.tsx 와 완전히 동일한 타입 정의를 사용합니다 ---
interface Author {
  username: string;
}
interface Report {
  reportId: string;
  reportContent: string;
  reportStatus: string;
  author: Author;
}
interface Study {
  studyKey: string;
  studydesc: string;
  studydate: string;
  studytime: string;
  modality: string;
  seriescnt: number;
  imagecnt: number;
  report: Report | null;
}
interface Patient {
  pid: string;
  pname: string;
  studies: Study[];
}
// --- 타입 정의 수정 완료 ---

// Context에 저장할 상태들의 타입을 정의
interface MainStateContextType {
  searchResults: Patient[];
  setSearchResults: Dispatch<SetStateAction<Patient[]>>;
  selectedPatient: Patient | null;
  setSelectedPatient: Dispatch<SetStateAction<Patient | null>>;
  selectedStudy: Study | null;
  setSelectedStudy: Dispatch<SetStateAction<Study | null>>;
  searchInput: { patientId: string; patientName: string };
  setSearchInput: Dispatch<SetStateAction<{ patientId: string; patientName: string }>>;
}

// Context 생성
const MainStateContext = createContext<MainStateContextType | undefined>(undefined);

// Provider 컴포넌트 생성 (이 컴포넌트가 실제로 상태를 가지고 있음)
export function MainStateProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [searchInput, setSearchInput] = useState({ patientId: '', patientName: '' });

  const value = {
    searchResults,
    setSearchResults,
    selectedPatient,
    setSelectedPatient,
    selectedStudy,
    setSelectedStudy,
    searchInput,
    setSearchInput,
  };

  return <MainStateContext.Provider value={value}>{children}</MainStateContext.Provider>;
}

// 이 hook을 사용해서 다른 컴포넌트에서 상태를 쉽게 꺼내 쓸 수 있음
export function useMainState() {
  const context = useContext(MainStateContext);
  if (context === undefined) {
    throw new Error('useMainState must be used within a MainStateProvider');
  }
  return context;
}