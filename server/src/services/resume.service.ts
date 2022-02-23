import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';
import { getCustomRepository, getRepository } from 'typeorm';
import { User } from '../models';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { ResumeRepository } from '../repositories/resume.repository';
import { StudentRepository } from '../repositories/student.repository';
import omit from 'lodash/omit';

export class ResumeService {
  private resumeRepository = getCustomRepository(ResumeRepository);
  private feedbackRespository = getCustomRepository(FeedbackRepository);
  private studentRepository = getCustomRepository(StudentRepository);
  private userRepository = getRepository(User);

  constructor(private githubId: string) {}

  public async updateStatus() {
    const resume = await this.resumeRepository.find(this.githubId);

    const EXPIRATION_DAYS_PROLONGATION = 14;

    const expirationTimestamp = DateTime.local().plus({ days: EXPIRATION_DAYS_PROLONGATION }).valueOf();
    const result = await this.resumeRepository.save(this.githubId, { ...resume, expires: expirationTimestamp });
    return result;
  }

  public async saveData(data: any) {
    const cv = await this.resumeRepository.find(this.githubId);
    const result = await this.resumeRepository.save(this.githubId, {
      ...cv,
      ...data,
    });

    const dataToSend = omit(result, ['id', 'expires', 'githubId', 'isHidden']);

    return dataToSend;
  }

  public async getViewData() {
    const resume = await this.resumeRepository.find(this.githubId);

    const [feedback, courses] = await Promise.all([
      this.feedbackRespository.getResumeFeedback(this.githubId),
      this.studentRepository.findAndIncludeStatsForResume(this.githubId),
    ]);

    const selectedCourses = courses
      .filter(course => resume?.visibleCourses.includes(course.courseId))
      .map(course => omit(course, ['courseId']));

    const viewData = {
      ...omit(resume, ['visibleCourses']),
      feedback,
      courses: selectedCourses,
    };

    return viewData;
  }

  public async getFormData() {
    const resume = await this.resumeRepository.find(this.githubId);

    const courses = await this.studentRepository.findStudentCourses(this.githubId);

    const realCourses = courses;

    const formData = {
      ...resume,
      courses: realCourses,
    };

    return formData;
  }

  public async getConsent() {
    const user = await this.userRepository.findOne({ where: { githubId: this.githubId } });
    if (user == null) {
      return false;
    }
    const value = user.opportunitiesConsent;
    return value;
  }

  public async updateConsent(consent: boolean) {
    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { githubId: this.githubId } });
    if (user == null) {
      throw StatusCodes.NOT_FOUND;
    }

    if (consent) {
      await this.createResume(this.githubId);
      await this.userRepository.update({ githubId: this.githubId }, { opportunitiesConsent: true });
      return true;
    }

    await this.removeResume(this.githubId);
    await this.userRepository.update({ githubId: this.githubId }, { opportunitiesConsent: false });
    return false;
  }

  private async createResume(githubId: string) {
    const current = await this.resumeRepository.find(githubId);

    if (current != null) {
      throw StatusCodes.CONFLICT;
    }

    return this.resumeRepository.create(githubId);
  }

  private async removeResume(githubId: string) {
    await this.resumeRepository.delete(githubId);
  }

  public async setVisibility(isVisible: boolean) {
    const resume = await this.resumeRepository.find(this.githubId);

    if (resume == null) {
      throw StatusCodes.NOT_FOUND;
    }

    const isHidden = !isVisible;
    await this.resumeRepository.save(this.githubId, { isHidden, id: resume.id });
    return isHidden;
  }
}
