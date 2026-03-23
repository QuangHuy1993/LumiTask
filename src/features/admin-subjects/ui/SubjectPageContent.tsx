"use server";

import React from "react";
import { subjectService } from "../services/subjectService";
import { SubjectListContainer } from "./SubjectListContainer";

/**
 * Server Component cho trang Quản lý môn học
 * Chịu trách nhiệm fetch dữ liệu ban đầu từ Server
 */
export async function SubjectPageContent() {
  const subjects = await subjectService.getAll();
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <SubjectListContainer initialSubjects={subjects} />
    </div>
  );
}
