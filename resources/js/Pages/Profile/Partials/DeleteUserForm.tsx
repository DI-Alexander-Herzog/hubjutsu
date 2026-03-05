import { useState } from "react";
import DangerButton from "@/Components/DangerButton";
import Modal from "@/Components/Modal";
import NeutralButton from "@/Components/NeutralButton";
import { useForm } from "@inertiajs/react";
import FormSection from "@/Components/FormSection";
import Input from "@/Components/Input";

export default function DeleteUserForm({
	className = "",
}: {
	className?: string;
}) {
	const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);

	const {
		data,
		setData,
		delete: destroy,
		processing,
		reset,
		errors,
	} = useForm({
		password: "",
	});

	const confirmUserDeletion = () => {
		setConfirmingUserDeletion(true);
	};

	const deleteUser = () => {
		destroy(route("profile.destroy"), {
			preserveScroll: true,
			onSuccess: () => closeModal(),
			onError: () => {},
			onFinish: () => reset(),
		});
	};

	const closeModal = () => {
		setConfirmingUserDeletion(false);
		reset();
	};

	return (
		<>
			<FormSection
				title="Delete Account"
				subtitle="Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain."
				className={className}
			>
				<DangerButton onClick={confirmUserDeletion}>
					Delete Account
				</DangerButton>
			</FormSection>

			<Modal
				show={confirmingUserDeletion}
				onClose={closeModal}
				title="Are you sure you want to delete your account?"
				subtitle="Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account."
				primaryButtonText="Delete Account"
				secondaryButtonText="Cancel"
				onPrimaryClick={deleteUser}
				onSecondaryClick={closeModal}
				primaryButtonDisabled={processing}
				primaryButtonType="danger"
			>
				<Input
					inputName="password"
					type="password"
					useForm={{ data, setData, errors }}
					required
					isFocused
					placeholder="Password"
					className="w-3/4"
					isFirst={true}
				/>
			</Modal>
		</>
	);
}
