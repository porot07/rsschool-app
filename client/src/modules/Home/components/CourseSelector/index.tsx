import { Select } from 'antd';
import { PlayCircleTwoTone, ClockCircleTwoTone, CheckCircleTwoTone } from '@ant-design/icons';
import React from 'react';
import { Course } from 'services/models';

type Props = {
  course: Course | null;
  onChangeCourse: (courseId: number) => void;
  courses: Course[];
};

export function CourseSelector(props: Props) {
  const { course, courses, onChangeCourse } = props;

  if (!course) {
    return null;
  }
  return (
    <Select
      showSearch
      optionFilterProp="children"
      style={{ width: 300, marginBottom: 16 }}
      defaultValue={course.id}
      onChange={onChangeCourse}
    >
      {courses.map(course => (
        <Select.Option key={course.id} value={course.id}>
          {getStatus(course)} {course.name}
        </Select.Option>
      ))}
    </Select>
  );
}

const getStatus = (course: Course) => {
  if (course.completed) {
    return <CheckCircleTwoTone title="Completed" />;
  }
  if (course.planned) {
    return <ClockCircleTwoTone title="Planned" twoToneColor="orange" />;
  }
  return <PlayCircleTwoTone title="Active" twoToneColor="#52c41a" />;
};
